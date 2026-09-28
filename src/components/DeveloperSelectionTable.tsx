import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Input,
  Popover,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { TableColumnsType } from "antd";
import { createClient } from "@supabase/supabase-js";
import ApplicationDrawer from "./ApplicationDrawer";
import { teamMembersText } from "./TeamDirectory";
import TeamSummary from "./TeamSummary";
import {
  type Application,
  type DeveloperSelection,
  removeSelection,
  replaceSelection,
  selectionForTeam,
  type SelectionType,
  teamsForType,
} from "../lib/selections";
import { type TeamInfo, teamLabel } from "../lib/teams";

interface DeveloperSelectionTableProps {
  data: Application[];
  team: string;
  teams: TeamInfo[];
  accessToken: string;
  channel: string;
  canEdit: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

type ViewFilter =
  | "all"
  | "ours"
  | "selected"
  | "waitlisted"
  | "saved"
  | "unclaimed"
  | "conflicts";

const VIEW_OPTIONS: { label: string; value: ViewFilter }[] = [
  { label: "All", value: "all" },
  { label: "Our picks", value: "ours" },
  { label: "Selected", value: "selected" },
  { label: "Waitlisted", value: "waitlisted" },
  { label: "Saved", value: "saved" },
  { label: "Unclaimed", value: "unclaimed" },
  { label: "Conflicts", value: "conflicts" },
];

const SEARCH_FIELDS: (keyof Application)[] = [
  "fake_name",
  "technologies",
  "classes_taken",
  "why_join_jumbocode",
  "volunteering_experience",
  "project_proud_of",
  "favorite_development_aspect",
  "intro_to_cs",
  "preferences_elaboration",
  "additional_info",
  "links",
];

// Columns a viewer can show or hide; the rest (actions, name) always show.
const OPTIONAL_COLUMNS = [
  { key: "rank", label: "Ranked us", defaultVisible: true },
  { key: "other_teams", label: "Other teams", defaultVisible: true },
  { key: "pronouns", label: "Pronouns", defaultVisible: true },
  { key: "class_year", label: "Class year", defaultVisible: true },
  { key: "underrepresented", label: "Underrepresented in STEM", defaultVisible: true },
  { key: "previous_dev", label: "Previous JumboCode dev", defaultVisible: true },
  { key: "technologies", label: "Technologies", defaultVisible: true },
  { key: "in_person_this", label: "In person this semester", defaultVisible: false },
  { key: "in_person_next", label: "In person next semester", defaultVisible: false },
  { key: "availability", label: "Meeting availability", defaultVisible: false },
  { key: "board_notes", label: "Board notes", defaultVisible: false },
] as const;

type OptionalColumnKey = (typeof OPTIONAL_COLUMNS)[number]["key"];

const COLUMN_STORAGE_KEY = "dev-selection:visible-columns";

function loadVisibleColumns(): OptionalColumnKey[] {
  const defaults = OPTIONAL_COLUMNS.filter((column) => column.defaultVisible).map(
    (column) => column.key,
  );
  try {
    const stored = JSON.parse(window.localStorage.getItem(COLUMN_STORAGE_KEY) ?? "null");
    if (Array.isArray(stored)) {
      const known = new Set<string>(OPTIONAL_COLUMNS.map((column) => column.key));
      return stored.filter((key): key is OptionalColumnKey => known.has(key));
    }
  } catch {
    // Storage can be unavailable (private windows, blocked site data).
  }
  return defaults;
}

function saveVisibleColumns(keys: OptionalColumnKey[]) {
  try {
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Column choice just won't persist.
  }
}

// Build filter options from the answers actually present so they don't go
// stale when the form's class years or answer choices change between cycles.
function answerFilters(data: Application[], key: string) {
  const values = new Set<string>();
  data.forEach((record) => {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") {
      values.add(String(value));
    }
  });
  return [...values]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((value) => ({ text: value, value }));
}

function truncatedText(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return (
    <Tooltip title={text} placement="topLeft">
      <span>{text}</span>
    </Tooltip>
  );
}

const DeveloperSelectionTable = (props: DeveloperSelectionTableProps) => {
  const [realtimeData, setRealtimeData] = useState<Application[]>(props.data ?? []);
  const [pendingSelections, setPendingSelections] = useState<Set<string>>(
    new Set(),
  );
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewFilter>("all");
  // 0 means any ranking.
  const [maxRank, setMaxRank] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<OptionalColumnKey[]>(
    loadVisibleColumns,
  );
  const [openFakeName, setOpenFakeName] = useState<string | null>(null);

  const rankingKey = `rank_${props.team}`;

  const teamsBySlug = useMemo(
    () => new Map(props.teams.map((team) => [team.team_name, team])),
    [props.teams],
  );
  const labelFor = (slug: string) =>
    teamLabel(slug, teamsBySlug.get(slug)?.display_name);

  const supabase = useMemo(
    () =>
      createClient(props.supabaseUrl, props.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }),
    [props.supabaseAnonKey, props.supabaseUrl],
  );

  useEffect(() => {
    let disposed = false;
    const channel = supabase
      .channel(props.channel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "developer_selections" },
        (payload) => {
          const row = (payload.eventType === "DELETE"
            ? payload.old
            : payload.new) as Partial<DeveloperSelection>;

          if (!row.fake_name || !row.team_name) return;

          setRealtimeData((currentData) =>
            currentData.map((developer) => {
              if (developer.fake_name !== row.fake_name) return developer;
              if (payload.eventType === "DELETE") {
                return removeSelection(developer, row.team_name!);
              }
              if (!row.selection_type) return developer;

              return replaceSelection(developer, {
                fake_name: row.fake_name,
                team_name: row.team_name!,
                selection_type: row.selection_type,
                created_by: row.created_by ?? null,
                created_at: row.created_at ?? new Date().toISOString(),
              });
            }),
          );
        },
      );

    void (async () => {
      supabase.realtime.setAuth(props.accessToken);
      if (!disposed) channel.subscribe();
    })();

    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [props.accessToken, props.channel, supabase]);

  async function mutateSelection(
    fakeName: string,
    selectionType: SelectionType | null,
  ): Promise<void> {
    setMutationError(null);
    setPendingSelections((current) => new Set(current).add(fakeName));

    try {
      const response = await fetch("/api/selections", {
        method: selectionType ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fakeName,
          teamName: props.team,
          selectionType,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign("/");
          return;
        }
        throw new Error(body?.error ?? "Could not update the selection");
      }

      // Realtime will reconcile all browsers. Updating this browser immediately
      // also makes the UI responsive if its websocket reconnects slowly.
      setRealtimeData((currentData) =>
        currentData.map((developer) => {
          if (developer.fake_name !== fakeName) return developer;
          if (!selectionType) return removeSelection(developer, props.team);
          return replaceSelection(developer, {
            fake_name: fakeName,
            team_name: props.team,
            selection_type: selectionType,
            created_by: null,
            created_at: new Date().toISOString(),
          });
        }),
      );
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Could not update the selection",
      );
    } finally {
      setPendingSelections((current) => {
        const next = new Set(current);
        next.delete(fakeName);
        return next;
      });
    }
  }

  function otherTeamsSelecting(record: Application): string[] {
    return teamsForType(record, "selected").filter((slug) => slug !== props.team);
  }

  function otherTeamsWaitlisting(record: Application): string[] {
    return teamsForType(record, "waitlisted").filter((slug) => slug !== props.team);
  }

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return realtimeData.filter((record) => {
      const ours = selectionForTeam(record, props.team)?.selection_type;
      const othersSelected = otherTeamsSelecting(record).length > 0;

      if (view === "ours" && !ours) return false;
      if ((view === "selected" || view === "waitlisted" || view === "saved") && ours !== view) {
        return false;
      }
      if (view === "unclaimed" && teamsForType(record, "selected").length > 0) return false;
      if (
        view === "conflicts" &&
        !((ours === "selected" || ours === "waitlisted") && othersSelected)
      ) {
        return false;
      }

      if (maxRank > 0 && !(Number(record[rankingKey]) <= maxRank)) return false;

      if (query) {
        return SEARCH_FIELDS.some((field) =>
          String(record[field] ?? "").toLowerCase().includes(query),
        );
      }
      return true;
    });
  }, [maxRank, props.team, rankingKey, realtimeData, search, view]);

  const filterOptions = useMemo(
    () => ({
      rank: answerFilters(props.data ?? [], rankingKey),
      classYear: answerFilters(props.data ?? [], "class_year"),
      underrepresented: answerFilters(props.data ?? [], "underrepresented_group_in_stem"),
      previousDev: answerFilters(props.data ?? [], "previous_jumbocode_developer"),
      inPersonThisSemester: answerFilters(props.data ?? [], "in_person_this_semester"),
      inPersonNextSemester: answerFilters(props.data ?? [], "in_person_next_semester"),
    }),
    [props.data, rankingKey],
  );

  function renderActions(record: Application) {
    const current = selectionForTeam(record, props.team)?.selection_type;
    const pending = pendingSelections.has(record.fake_name);
    const disabled = !props.canEdit || pending;
    const buttons: { type: SelectionType; on: string; off: string }[] = [
      { type: "selected", on: "Unselect", off: "Select" },
      { type: "waitlisted", on: "Un-waitlist", off: "Waitlist" },
      { type: "saved", on: "Unsave", off: "Save" },
    ];

    return (
      <Space size={4} onClick={(event) => event.stopPropagation()}>
        {buttons.map((button) => {
          const active = current === button.type;
          return (
            <Button
              key={button.type}
              size="small"
              shape="round"
              type={active || button.type !== "saved" ? "primary" : "default"}
              danger={active}
              disabled={disabled}
              loading={pending}
              onClick={() =>
                mutateSelection(record.fake_name, active ? null : button.type)
              }
            >
              {active ? button.on : button.off}
            </Button>
          );
        })}
      </Space>
    );
  }

  function renderOtherTeams(record: Application) {
    const selected = otherTeamsSelecting(record);
    const waitlisted = otherTeamsWaitlisting(record);
    if (selected.length === 0 && waitlisted.length === 0) {
      return <span className="text-gray-400">None</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {selected.map((slug) => (
          <Tooltip key={`s-${slug}`} title={`Selected. Talk to: ${teamMembersText(teamsBySlug.get(slug))}`}>
            <Tag color="orange">{labelFor(slug)}</Tag>
          </Tooltip>
        ))}
        {waitlisted.map((slug) => (
          <Tooltip key={`w-${slug}`} title={`Waitlisted. Talk to: ${teamMembersText(teamsBySlug.get(slug))}`}>
            <Tag>{labelFor(slug)} (waitlist)</Tag>
          </Tooltip>
        ))}
      </div>
    );
  }

  const columns = useMemo<TableColumnsType<Application>>(() => {
    const visible = new Set<string>(visibleColumns);
    const optional: (TableColumnsType<Application>[number] & { key: OptionalColumnKey })[] = [
      {
        title: "Ranked us",
        dataIndex: rankingKey,
        key: "rank",
        width: 100,
        sorter: (a, b) => Number(a[rankingKey]) - Number(b[rankingKey]),
        defaultSortOrder: "ascend",
        filters: filterOptions.rank,
        onFilter: (value, record) => Number(record[rankingKey]) === Number(value),
      },
      {
        title: "Other teams",
        key: "other_teams",
        width: 220,
        render: (_value, record) => renderOtherTeams(record),
        sorter: (a, b) => otherTeamsSelecting(a).length - otherTeamsSelecting(b).length,
      },
      { title: "Pronouns", dataIndex: "pronouns", key: "pronouns", width: 110 },
      {
        title: "Class",
        dataIndex: "class_year",
        key: "class_year",
        width: 110,
        ellipsis: { showTitle: false },
        render: truncatedText,
        filters: filterOptions.classYear,
        onFilter: (value, record) => record.class_year === String(value),
        sorter: (a, b) => a.class_year.localeCompare(b.class_year),
      },
      {
        title: "Underrep. in STEM",
        dataIndex: "underrepresented_group_in_stem",
        key: "underrepresented",
        width: 130,
        filters: filterOptions.underrepresented,
        onFilter: (value, record) => record.underrepresented_group_in_stem === value,
      },
      {
        title: "Prev. JC dev",
        dataIndex: "previous_jumbocode_developer",
        key: "previous_dev",
        width: 110,
        filters: filterOptions.previousDev,
        onFilter: (value, record) => record.previous_jumbocode_developer === value,
      },
      {
        title: "Technologies",
        dataIndex: "technologies",
        key: "technologies",
        width: 280,
        ellipsis: { showTitle: false },
        render: truncatedText,
      },
      {
        title: "In person (this sem.)",
        dataIndex: "in_person_this_semester",
        key: "in_person_this",
        width: 140,
        filters: filterOptions.inPersonThisSemester,
        onFilter: (value, record) => record.in_person_this_semester === value,
      },
      {
        title: "In person (next sem.)",
        dataIndex: "in_person_next_semester",
        key: "in_person_next",
        width: 140,
        filters: filterOptions.inPersonNextSemester,
        onFilter: (value, record) => record.in_person_next_semester === value,
      },
      {
        title: "Availability",
        dataIndex: "weekly_meeting_availability",
        key: "availability",
        width: 240,
        ellipsis: { showTitle: false },
        render: truncatedText,
      },
      {
        title: "Board notes",
        dataIndex: "board_notes",
        key: "board_notes",
        width: 200,
        ellipsis: { showTitle: false },
        render: truncatedText,
      },
    ];

    return [
      {
        title: "Actions",
        key: "actions",
        fixed: "left",
        width: 250,
        render: (_value, record) => renderActions(record),
      },
      {
        title: "Fake Name",
        dataIndex: "fake_name",
        key: "fake_name",
        fixed: "left",
        width: 170,
        render: (value: string, record) => (
          <div>
            <Button type="link" className="p-0" onClick={() => setOpenFakeName(record.fake_name)}>
              {value}
            </Button>
            {selectionForTeam(record, props.team)?.selection_type === "saved" && (
              <div>
                <Tag color="gold">Saved</Tag>
              </div>
            )}
          </div>
        ),
      },
      ...optional.filter((column) => visible.has(column.key)),
    ];
  }, [filterOptions, pendingSelections, props.canEdit, props.team, rankingKey, teamsBySlug, visibleColumns]);

  const openIndex = filteredData.findIndex((record) => record.fake_name === openFakeName);
  const openRecord =
    openIndex >= 0
      ? filteredData[openIndex]!
      : realtimeData.find((record) => record.fake_name === openFakeName) ?? null;

  const columnPicker = (
    <Checkbox.Group
      className="flex flex-col gap-1"
      value={visibleColumns}
      options={OPTIONAL_COLUMNS.map((column) => ({ label: column.label, value: column.key }))}
      onChange={(keys) => {
        const next = keys as OptionalColumnKey[];
        setVisibleColumns(next);
        saveVisibleColumns(next);
      }}
    />
  );

  return (
    <div className="space-y-8">
      <Card title={`Your Team: ${labelFor(props.team)}`}>
        <TeamSummary data={realtimeData} team={props.team} />
      </Card>

      <Card title="Developer Applications">
        {mutationError && (
          <Alert
            className="mb-4"
            type="error"
            showIcon
            closable
            message={mutationError}
            onClose={() => setMutationError(null)}
          />
        )}

        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input.Search
              allowClear
              placeholder="Search names, technologies, essays…"
              className="max-w-md"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              className="w-44"
              value={maxRank}
              onChange={setMaxRank}
              options={[
                { label: "Any ranking", value: 0 },
                { label: "Ranked us #1", value: 1 },
                { label: "Ranked us top 2", value: 2 },
                { label: "Ranked us top 3", value: 3 },
                { label: "Ranked us top 4", value: 4 },
              ]}
            />
            <Popover trigger="click" placement="bottomLeft" content={columnPicker} title="Show columns">
              <Button>Columns</Button>
            </Popover>
            <span className="text-sm text-gray-500">
              Showing {filteredData.length} of {realtimeData.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Segmented
              options={VIEW_OPTIONS}
              value={view}
              onChange={(value) => setView(value as ViewFilter)}
            />
          </div>
        </div>

        <Table
          rowKey="fake_name"
          sticky
          size="middle"
          rowClassName={(record) => {
            const ours = selectionForTeam(record, props.team)?.selection_type;
            const others = otherTeamsSelecting(record).length > 0;
            // Target the cells: fixed and sorted columns paint their own background.
            if ((ours === "selected" || ours === "waitlisted") && others) {
              return "cursor-pointer [&>td]:!bg-orange-100";
            }
            if (ours === "selected") return "cursor-pointer [&>td]:!bg-green-100";
            if (ours === "waitlisted") return "cursor-pointer [&>td]:!bg-sky-100";
            return "cursor-pointer";
          }}
          onRow={(record) => ({ onClick: () => setOpenFakeName(record.fake_name) })}
          columns={columns}
          dataSource={filteredData}
          pagination={{ defaultPageSize: 25, showSizeChanger: true }}
          scroll={{ x: "max-content" }}
        />
        <p className="mt-2 text-sm text-gray-500">
          Green: selected by you. Blue: waitlisted by you. Orange: you picked them
          and another team selected them too. Click a row to read the full application.
        </p>
      </Card>

      <ApplicationDrawer
        record={openRecord}
        rankingKey={rankingKey}
        position={{ index: Math.max(openIndex, 0), total: filteredData.length }}
        actions={openRecord && renderActions(openRecord)}
        otherTeams={
          openRecord && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Other teams:</span>
              {renderOtherTeams(openRecord)}
            </div>
          )
        }
        onClose={() => setOpenFakeName(null)}
        onPrevious={() => {
          const previous = filteredData[openIndex - 1];
          if (previous) setOpenFakeName(previous.fake_name);
        }}
        onNext={() => {
          const next = filteredData[openIndex + 1];
          if (next) setOpenFakeName(next.fake_name);
        }}
      />
    </div>
  );
};

export default DeveloperSelectionTable;
