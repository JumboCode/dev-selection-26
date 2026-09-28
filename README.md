# JumboCode Developer Selection Fall 2024

A web-based system to anonymously select developers for JumboCode teams.

## Database migration

Restore `db_cluster-18-10-2024@11-18-20.backup` when starting from the 2024
database, then apply the migrations in `supabase/migrations` in filename order.
The normalized-selection migration:

- backfills the comma-separated `dev_selections` values into one
  `developer_selections` row per developer and team;
- creates locked database functions for selection, removal, submission, and
  Board approval;
- enables RLS and removes direct write grants;
- seeds every existing Board user with every existing team in
  `board_selection_scopes`; and
- adds the normalized table to the Supabase Realtime publication.

The legacy `dev_selections` table is intentionally retained for rollout
verification, but the application no longer reads or writes it. Remove it in a
later migration only after comparing the backfilled rows in production.

Board access is explicit. Add or remove rows in `board_selection_scopes` with a
trusted administrator/service-role connection when a Board member's scope
changes.

## Selection workflow

All selection writes go through `set_developer_selection` and
`remove_developer_selection`. These functions lock the applicable
`team_status` row. `submit_team_selections` takes the same lock, verifies
10–12 selected developers and 1–3 waitlisted developers, and atomically changes
the status to `Under Review`. Team users cannot edit after submission; scoped
Board users can edit during review and can finalize it with
`approve_team_selections`. A team can also mark developers `saved` (a private
shortlist); saved rows don't count toward submission.

Approval sets `confirmed_team` on each selected developer and is refused if any
of them is already confirmed to another team, so the Board must resolve that
conflict first. Once a team is `Complete`, `get_confirmed_roster()` reveals its
developers' real names and emails on the dashboard to that team and its scoped
Board members; `sensitive_application_data` stays unreadable through the API.

Project names shown in the UI come from `team_status.display_name`. The team
directory on each selection page lists members from `user_roles`; set
`user_roles.headshot_url` to any public image URL to show a headshot instead of
initials.

The Astro server creates a new Supabase client for every request. Browser code
receives only the access token needed for Realtime and sends mutations to the
same-origin API; refresh tokens remain in HTTP-only cookies.

## How to upload applications to the dev selection database

1. Clone the repository
2. Create a `.env` file in the root directory with the following entries:
  - SUPABASE_DB_URI (uri to directly access the supabase DB)
3. Apply the migrations (`npx supabase db push`). `202609240001_setup_2026_27_cycle.sql`
   swaps in the 2026–27 ranking/question columns and resets `team_status` to
   the eight 2026–27 teams. Team slugs (e.g. `damiens_place`) are the
   `team_status.team_name`, the `/dev-selection/<team>` URL, and the
   `rank_<team>` column suffix, so the script's `short_column_names` and the
   migration must agree. Then add each team lead to `user_roles`
   (`email`, `role`, `team_name` = slug, `first_name`) and give them a Supabase
   Auth login. Board members added after the migration also need rows in
   `board_selection_scopes`.
4. In the root directory run `./scripts/run_scripts.ps1` (if on Windows; pass `-ApplicationsCsv <path>` to use a different export) or `python ./scripts/parse_application_data.py <applications.csv> ./data/lotr_names.csv`.
   The script checks the CSV header against `full_column_names` and stops before touching the database if a new form's questions don't match. To dump script outputs in a directory other than the root, specify an absolute path using the `-o` flag.
For help on how to run the Python script, run `python ./scripts/parse_application_data.py -h`.

Importing applications starts a new selection cycle: it clears both normalized
and legacy selection rows before replacing application rows. Existing table
schemas, foreign keys, and RLS policies are preserved.

## Verification

Run the compiler and production build:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

The concurrency suite uses separate authenticated Supabase clients and checks
cross-team writes, duplicate clicks, permissions, direct-write denial, and the
selection-versus-submission race. It is destructive by design and must only run
against a dedicated test project. Copy `.env.test.example`, provide disposable
users and fake names, load those variables, then run:

```sh
npm run test:concurrency
```

## Deployment

### Build and runtime

The app uses Astro 5 and the Vercel 8 adapter. Use Node.js 22.12 or newer within
the Node 22 release line, and configure the Vercel project to use Node.js `22.x`.
The adapter derives the function runtime from the Node version running the build.

```sh
npm ci
ASTRO_TELEMETRY_DISABLED=1 npm run build
```

Before deploying, verify that `.vercel/output/functions/_render.func/.vc-config.json`
contains `"runtime": "nodejs22.x"`. A successful build alone does not guarantee
that the emitted runtime is supported by Vercel.

### Stage the release

1. Create or select a non-production Supabase project.
2. Configure a Vercel Preview environment with the staging project's
   `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Do not put `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_URI` in Vercel.
4. Apply the migration to staging from the repository root:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_STAGING_PROJECT_REF
   npx supabase migration list
   npx supabase db push --dry-run
   npx supabase db push
   ```

5. Run the concurrency suite against staging using `.env.test.example`.
6. Deploy the feature branch as a Vercel Preview and verify:
   - simultaneous selections by multiple teams are all retained;
   - selected/waitlisted changes update in both browsers through Realtime;
   - a team cannot change another team's selections;
   - invalid counts cannot be submitted;
   - valid submission blocks further team changes; and
   - scoped Board users can review and approve the team.

### Production cutover

Perform the cutover while selection activity is paused. The database migration
must be applied before the new application, but it also revokes the old
application's write access, so keep the interval between these steps short.

1. Pause selection activity and confirm a current Supabase backup under
   **Database > Backups**.
2. Link the Supabase CLI to the production project:

   ```sh
   npx supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF
   npx supabase migration list
   npx supabase db push --dry-run
   ```

3. Confirm that the dry run lists only the expected normalized-selection
   migration, then apply it:

   ```sh
   npx supabase db push
   ```

4. Confirm `developer_selections` was backfilled and review the generated
   `board_selection_scopes` rows.
5. Merge the tested feature branch into the Vercel production branch, normally
   `main`, or explicitly promote the tested deployment.
6. Smoke-test team login, selection, Realtime, submission, Board approval, and
   sign-out before resuming selection activity.
7. Monitor Vercel function logs and Supabase API/database logs during the first
   live selection period.

Do not roll back only the Vercel application after the migration: the old
application writes the deprecated table. Prefer a fix-forward. A full rollback
requires restoring the pre-cutover database backup and the prior Vercel
deployment, which can discard selections made after the backup.