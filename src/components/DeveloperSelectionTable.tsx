import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { createClient } from "@supabase/supabase-js";

type SelectionType = "selected" | "waitlisted";

interface DeveloperSelection {
  fake_name?: string;
  team_name: string;
  selection_type: SelectionType;
  created_by: string | null;
  created_at: string;
}

interface DataType {
  key: string | number;
  fake_name: string;
  board_notes: string;
  pronouns: string;
  class_year: string;
  underrepresented_group_in_stem: string;
  why_join_jumbocode: string;
  volunteering_experience: string;
  in_person_this_semester: string;
  in_person_next_semester: string;
  weekly_meeting_availability: string;
  classes_taken: string;
  technologies: string;
  intro_to_cs: string;
  project_proud_of: string;
  links: string;
  preferences_elaboration: string;
  additional_info: string;
  previous_jumbocode_developer: string;
  devops_interest: string;
  favorite_development_aspect: string;
  mentorship_interest: string;
  developer_selections: DeveloperSelection[] | null;
  [key: string]: unknown;
}

interface DeveloperSelectionTableProps {
  data: DataType[];
  team: string;
  accessToken: string;
  channel: string;
  canEdit: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// Build filter options from the answers actually present so they don't go
// stale when the form's class years or answer choices change between cycles.
function answerFilters(data: DataType[], key: string) {
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

function selectionsFor(record: DataType): DeveloperSelection[] {
  return Array.isArray(record.developer_selections)
    ? record.developer_selections
    : [];
}

function selectionForTeam(
  record: DataType,
  team: string,
): DeveloperSelection | undefined {
  return selectionsFor(record).find((selection) => selection.team_name === team);
}

function teamsForType(record: DataType, type: SelectionType): string[] {
  return selectionsFor(record)
    .filter((selection) => selection.selection_type === type)
    .map((selection) => selection.team_name)
    .sort();
}

function replaceSelection(
  record: DataType,
  nextSelection: DeveloperSelection,
): DataType {
  const nextSelections = selectionsFor(record).filter(
    (selection) => selection.team_name !== nextSelection.team_name,
  );
  nextSelections.push(nextSelection);
  return { ...record, developer_selections: nextSelections };
}

function removeSelection(record: DataType, team: string): DataType {
  return {
    ...record,
    developer_selections: selectionsFor(record).filter(
      (selection) => selection.team_name !== team,
    ),
  };
}

const DeveloperSelectionTable = (props: DeveloperSelectionTableProps) => {
  const [realtimeData, setRealtimeData] = useState<DataType[]>(props.data ?? []);
  const [pendingSelections, setPendingSelections] = useState<Set<string>>(
    new Set(),
  );
  const [mutationError, setMutationError] = useState<string | null>(null);

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

  const filterOptions = useMemo(
    () => ({
      rank: answerFilters(props.data ?? [], `rank_${props.team}`),
      classYear: answerFilters(props.data ?? [], "class_year"),
      underrepresented: answerFilters(
        props.data ?? [],
        "underrepresented_group_in_stem",
      ),
      inPersonThisSemester: answerFilters(
        props.data ?? [],
        "in_person_this_semester",
      ),
      inPersonNextSemester: answerFilters(
        props.data ?? [],
        "in_person_next_semester",
      ),
    }),
    [props.data, props.team],
  );

  const columns = useMemo<TableColumnsType<DataType>>(() => {
    const rankingKey = `rank_${props.team}`;
    return [
      {
        title: "Select",
        key: "select",
        render: (_value, record) => {
          const teamSelection = selectionForTeam(record, props.team);
          const pending = pendingSelections.has(record.fake_name);
          return (
            <>
              <Button
                size="small"
                shape="round"
                type="primary"
                danger={teamSelection?.selection_type === "selected"}
                disabled={!props.canEdit || pending}
                loading={pending}
                onClick={() =>
                  mutateSelection(
                    record.fake_name,
                    teamSelection?.selection_type === "selected"
                      ? null
                      : "selected",
                  )
                }
              >
                {teamSelection?.selection_type === "selected"
                  ? "Unselect"
                  : "Select"}
              </Button>

              <div className="my-2" />

              <Button
                size="small"
                shape="round"
                type="primary"
                danger={teamSelection?.selection_type === "waitlisted"}
                disabled={!props.canEdit || pending}
                loading={pending}
                onClick={() =>
                  mutateSelection(
                    record.fake_name,
                    teamSelection?.selection_type === "waitlisted"
                      ? null
                      : "waitlisted",
                  )
                }
              >
                {teamSelection?.selection_type === "waitlisted"
                  ? "Un-waitlist"
                  : "Waitlist"}
              </Button>
            </>
          );
        },
      },
      {
        title: "Selected By",
        key: "selected_by",
        filters: [{ text: `Selected by ${props.team}`, value: props.team }],
        onFilter: (_value, record) =>
          teamsForType(record, "selected").includes(props.team),
        render: (_value, record) => teamsForType(record, "selected").join(", "),
        sorter: (a, b) =>
          Number(teamsForType(b, "selected").includes(props.team)) -
          Number(teamsForType(a, "selected").includes(props.team)),
      },
      {
        title: "Waitlisted By",
        key: "waitlisted_by",
        filters: [{ text: `Waitlisted by ${props.team}`, value: props.team }],
        onFilter: (_value, record) =>
          teamsForType(record, "waitlisted").includes(props.team),
        render: (_value, record) =>
          teamsForType(record, "waitlisted").join(", "),
        sorter: (a, b) =>
          Number(teamsForType(b, "waitlisted").includes(props.team)) -
          Number(teamsForType(a, "waitlisted").includes(props.team)),
      },
      {
        title: "Ranking",
        dataIndex: rankingKey,
        key: rankingKey,
        sorter: (a, b) => Number(a[rankingKey]) - Number(b[rankingKey]),
        filters: filterOptions.rank,
        onFilter: (value, record) => Number(record[rankingKey]) === Number(value),
      },
      { title: "Fake Name", dataIndex: "fake_name", key: "fake_name" },
      { title: "Pronouns", dataIndex: "pronouns", key: "pronouns" },
      {
        title: "Class Year",
        dataIndex: "class_year",
        key: "class_year",
        filters: filterOptions.classYear,
        onFilter: (value, record) => record.class_year === String(value),
        sorter: (a, b) => a.class_year.localeCompare(b.class_year),
      },
      { title: "Board Notes", dataIndex: "board_notes", key: "board_notes" },
      {
        title: "Underrepresented in STEM",
        dataIndex: "underrepresented_group_in_stem",
        key: "underrepresented_group_in_stem",
        filters: filterOptions.underrepresented,
        onFilter: (value, record) =>
          record.underrepresented_group_in_stem === value,
      },
      {
        title: "In person this semester?",
        dataIndex: "in_person_this_semester",
        key: "in_person_this_semester",
        filters: filterOptions.inPersonThisSemester,
        onFilter: (value, record) => record.in_person_this_semester === value,
      },
      {
        title: "In person next semester?",
        dataIndex: "in_person_next_semester",
        key: "in_person_next_semester",
        filters: filterOptions.inPersonNextSemester,
        onFilter: (value, record) => record.in_person_next_semester === value,
      },
      {
        title: "Familiar Technologies",
        dataIndex: "technologies",
        key: "technologies",
      },
      {
        title: "Personal Portfolio/Other Links",
        dataIndex: "links",
        key: "links",
      },
    ];
  }, [filterOptions, pendingSelections, props.canEdit, props.team]);

  function renderEssays(entry: DataType) {
    const essays = [
      {
        question:
          "Why do you want to join JumboCode? What do you hope to gain by joining the club?",
        response: entry.why_join_jumbocode,
      },
      {
        question:
          "What's your experience with volunteering, working with non-profits, community engagement, and/or social good activism?",
        response: entry.volunteering_experience,
      },
      {
        question: "What's your availability for a one-hour weekly team meeting?",
        response: entry.weekly_meeting_availability,
      },
      {
        question: "Have you been a Developer for JumboCode before?",
        response: entry.previous_jumbocode_developer,
      },
      {
        question:
          "If you answered YES to the previous question: would you be interested in being considered for our DevOps team, rather than a current project?",
        response: entry.devops_interest,
      },
      {
        question: "What aspect of developing do you enjoy the most?",
        response: entry.favorite_development_aspect,
      },
      { question: "CS Classes Taken", response: entry.classes_taken },
      {
        question: "What was your first introduction to computer science?",
        response: entry.intro_to_cs,
      },
      {
        question: "Tell us about a project you're proud of",
        response: entry.project_proud_of,
      },
      {
        question: "Project Preference Elaboration",
        response: entry.preferences_elaboration,
      },
      {
        question: "Is there anything else you want to add/want us to know?",
        response: entry.additional_info,
      },
    ];

    return essays.map((essay) => (
      <div
        key={essay.question}
        className="m-1 my-2 rounded border-4 border-gray-200 p-2"
      >
        <p className="mb-2 text-md font-semibold">{essay.question}</p>
        <p className="mb-2">{essay.response}</p>
      </div>
    ));
  }

  return (
    <>
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
      <Table
        rowKey="fake_name"
        rowClassName={(record) => {
          const selectedBy = teamsForType(record, "selected");
          if (selectedBy.length === 0) return "bg-white -my-2";
          if (selectedBy.length === 1 && selectedBy[0] === props.team) {
            return "bg-green-100 -my-2";
          }
          return "bg-orange-100 -my-2";
        }}
        columns={columns}
        expandable={{
          expandedRowRender: (record) => (
            <div className="max-w-96 md:max-w-screen-sm lg:max-w-screen-md xl:max-w-screen-lg">
              {renderEssays(record)}
            </div>
          ),
          rowExpandable: () => true,
        }}
        dataSource={realtimeData}
        scroll={{ x: "max-content" }}
      />
    </>
  );
};

export default DeveloperSelectionTable;
