import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.RUN_SUPABASE_INTEGRATION_TESTS === "1";

function requiredEnvironment(name) {
  const value = process.env[name];
  assert.ok(value, `${name} is required`);
  return value;
}

function readConfiguration() {
  assert.equal(
    process.env.SUPABASE_TEST_ALLOW_DESTRUCTIVE,
    "YES_I_AM_USING_A_TEST_DATABASE",
    "Concurrency tests reset selection rows and statuses; use a dedicated test database",
  );

  const users = JSON.parse(requiredEnvironment("SUPABASE_TEST_USERS"));
  const fakeNames = requiredEnvironment("SUPABASE_TEST_FAKE_NAMES")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  assert.ok(Array.isArray(users) && users.length >= 2, "Configure at least two team users");
  for (const user of users) {
    assert.equal(typeof user.email, "string");
    assert.equal(typeof user.password, "string");
    assert.equal(typeof user.team, "string");
  }
  assert.ok(fakeNames.length >= 14, "Configure at least 14 disposable fake names");

  return {
    url: requiredEnvironment("SUPABASE_URL"),
    anonKey: requiredEnvironment("SUPABASE_ANON_KEY"),
    serviceRoleKey: requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    users,
    fakeNames,
  };
}

function newClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function authenticatedClient(config, credentials) {
  const client = newClient(config.url, config.anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  assert.ifError(error);
  assert.ok(data.user);
  return { client, user: data.user };
}

async function resetFixtures(service, config) {
  const teams = config.users.map((user) => user.team);
  const { error: statusError } = await service
    .from("team_status")
    .update({ status: "In Progress" })
    .in("team_name", teams);
  assert.ifError(statusError);

  const { error: selectionError } = await service
    .from("developer_selections")
    .delete()
    .in("team_name", teams)
    .in("fake_name", config.fakeNames);
  assert.ifError(selectionError);
}

test(
  "concurrent teams retain every selection and workflow locking is atomic",
  { skip: !enabled, timeout: 60_000 },
  async (t) => {
    const config = readConfiguration();
    const service = newClient(config.url, config.serviceRoleKey);
    const sessions = await Promise.all(
      config.users.map((credentials) => authenticatedClient(config, credentials)),
    );

    await resetFixtures(service, config);
    t.after(async () => resetFixtures(service, config));

    await t.test("all teams can select the same developer without lost updates", async () => {
      const fakeName = config.fakeNames[0];
      const results = await Promise.all(
        sessions.map(({ client }, index) =>
          client.rpc("set_developer_selection", {
            p_fake_name: fakeName,
            p_team_name: config.users[index].team,
            p_selection_type: "selected",
          }),
        ),
      );

      for (const result of results) assert.ifError(result.error);

      const { data, error } = await service
        .from("developer_selections")
        .select("fake_name, team_name, selection_type")
        .eq("fake_name", fakeName)
        .in("team_name", config.users.map((user) => user.team));
      assert.ifError(error);
      assert.deepEqual(
        data.map((row) => row.team_name).sort(),
        config.users.map((user) => user.team).sort(),
      );
      assert.ok(data.every((row) => row.selection_type === "selected"));
    });

    await t.test("duplicate clicks from one team remain idempotent", async () => {
      const fakeName = config.fakeNames[1];
      const { client } = sessions[0];
      const team = config.users[0].team;
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          client.rpc("set_developer_selection", {
            p_fake_name: fakeName,
            p_team_name: team,
            p_selection_type: "selected",
          }),
        ),
      );
      for (const result of results) assert.ifError(result.error);

      const { count, error } = await service
        .from("developer_selections")
        .select("*", { count: "exact", head: true })
        .eq("fake_name", fakeName)
        .eq("team_name", team);
      assert.ifError(error);
      assert.equal(count, 1);
    });

    await t.test("a team cannot mutate another team's selection", async () => {
      const result = await sessions[0].client.rpc("set_developer_selection", {
        p_fake_name: config.fakeNames[2],
        p_team_name: config.users[1].team,
        p_selection_type: "selected",
      });
      assert.ok(result.error);
      assert.equal(result.error.code, "42501");
    });

    await t.test("direct table writes stay blocked even for a team member", async () => {
      const result = await sessions[0].client.from("developer_selections").insert({
        fake_name: config.fakeNames[2],
        team_name: config.users[0].team,
        selection_type: "selected",
      });
      assert.ok(result.error);
    });

    await t.test("selection and submission serialize on the team status lock", async () => {
      const credentials = config.users[0];
      const [{ client: firstClient, user }, { client: secondClient }] =
        await Promise.all([
          authenticatedClient(config, credentials),
          authenticatedClient(config, credentials),
        ]);
      const team = credentials.team;

      await resetFixtures(service, config);
      const fixtureRows = [
        ...config.fakeNames.slice(0, 12).map((fakeName) => ({
          fake_name: fakeName,
          team_name: team,
          selection_type: "selected",
          created_by: user.id,
        })),
        {
          fake_name: config.fakeNames[12],
          team_name: team,
          selection_type: "waitlisted",
          created_by: user.id,
        },
      ];
      const { error: fixtureError } = await service
        .from("developer_selections")
        .insert(fixtureRows);
      assert.ifError(fixtureError);

      const [selectionResult, submissionResult] = await Promise.all([
        firstClient.rpc("set_developer_selection", {
          p_fake_name: config.fakeNames[13],
          p_team_name: team,
          p_selection_type: "selected",
        }),
        secondClient.rpc("submit_team_selections"),
      ]);

      assert.notEqual(
        Boolean(selectionResult.error),
        Boolean(submissionResult.error),
        "exactly one racing operation must succeed",
      );

      const { data: statusRow, error: statusError } = await service
        .from("team_status")
        .select("status")
        .eq("team_name", team)
        .single();
      assert.ifError(statusError);

      const { data: extraRows, error: extraError } = await service
        .from("developer_selections")
        .select("fake_name")
        .eq("team_name", team)
        .eq("fake_name", config.fakeNames[13]);
      assert.ifError(extraError);

      if (statusRow.status === "Under Review") {
        assert.ok(selectionResult.error);
        assert.equal(extraRows.length, 0);
      } else {
        assert.equal(statusRow.status, "In Progress");
        assert.ok(submissionResult.error);
        assert.equal(extraRows.length, 1);
      }
    });
  },
);
