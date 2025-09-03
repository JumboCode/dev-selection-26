import { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { createClient } from "@supabase/supabase-js";

interface DataType {
  timestamp: string;  // Assuming timestamp is a string in ISO format or similar
  full_name: string;
  board_notes: string;
  pronouns: string;
  email: string;
  class_year: number;  // Assuming class_year is a number
  underrepresented_group_in_stem: string;  // Assuming it's a boolean (yes/no question)
  why_join_jumbocode: string;
  volunteering_experience: string;
  in_person_this_semester: string;
  in_person_next_semester: string;
  weekly_meeting_availability: string;  // Assuming this is some availability string
  classes_taken: string;
  technologies: string;
  intro_to_cs: string;
  project_proud_of: string;
  links: string;
  rank_wmcc: number;  // Assuming rank columns are numeric
  rank_village_food_hub: number;
  rank_wily_network: number;
  rank_somerville_museum: number;
  rank_dillar_academy: number;
  rank_neip: number;
  rank_lgbtq_senior_housing: number;
  rank_lcs_tutoring: number;
  rank_english_at_large: number;
  rank_bread_and_roses: number;
  rank_a2empowerment: number;
  rank_tufts_general_counsel: number;
  preferences_elaboration: string;
  uncomfortable_with: string;
  additional_info: string;
  jumbocode_previous_projects: string;
  fake_name: string;
  confirmed_team: boolean;  // Assuming confirmed_team is a boolean
  dev_selections: {
    selected_by: string,
    waitlisted_by: string
  }
}


interface DevSelectionTableProps {
  data: DataType[],
  team: string,
  accessToken: any,
  refreshToken: any,
  channel: string,
  onlySelected: boolean,
  supabaseUrl: string,
  supabaseAnonKey: string
}

const columns: TableColumnsType<DataType> = [
  { title: 'Fake Name', dataIndex: 'fake_name', key: 'fake_name' },
  { title: 'Pronouns', dataIndex: 'pronouns', key: 'pronouns' },
  {
    title: 'Class Year',
    dataIndex: 'class_year',
    key: 'class_year',
    filters: [
      {
        text: "2025",
        value: "2025"
      },
      {
        text: "2026",
        value: "2026"
      },
      {
        text: "2027",
        value: "2027"
      },
      {
        text: "2028",
        value: "2028"
      },
      {
        text: "Masters Student (Tufts undergrad)",
        value: "Masters Student (Tufts undergrad)"
      },
      {
        text: "Masters Student (non-Tufts undergrad)",
        value: "Masters Student (non-Tufts undergrad)"
      }
    ],
    onFilter: (val, record) => record.class_year === val,
    sorter: {
      compare: (a, b) => a.class_year - b.class_year
    },
  },
  { title: 'Board Notes', dataIndex: 'board_notes', key: 'board_notes' },
  {
    title: 'Underrespresented in STEM',
    dataIndex: 'underrepresented_group_in_stem',
    key: 'underrepresented_group_in_stem',
    filters: [{ text: "Yes", value: "Yes" }, { text: "No", value: "No" }],
    onFilter: (val, record) => record.underrepresented_group_in_stem === val
  },
  {
    title: 'In person this semester?', dataIndex: 'in_person_this_semester', key: 'in_person_this_semester',
    filters: [{ text: "Yes", value: "Yes" }, { text: "Studying remotely", value: "Studying remotely" }, { text: "Taking a gap semester", value: "Taking a gap semester" }],
    onFilter: (val, record) => record.in_person_this_semester === val
  },
  {
    title: 'In person next semester?', dataIndex: 'in_person_next_semester', key: 'in_person_next_semester',
    filters: [{ text: "Yes", value: "Yes" }, { text: "Studying remotely", value: "Studying remotely" }, { text: "Taking a gap semester", value: "Taking a gap semester" }],
    onFilter: (val, record) => record.in_person_next_semester === val
  },
  { title: 'Familiar Technologies', dataIndex: 'technologies', key: 'technologies' },
  { title: 'Personal Portfolio/Other Links', dataIndex: 'links', key: 'links' },
];

async function getSelectionsOnDev(supabase: any, fake_name: string, waitlist: boolean) {
  const { data: selectionsQuery, error: selectionsQueryError } = await supabase
    .from("dev_selections")
    .select("selected_by, waitlisted_by")
    .eq("fake_name", fake_name)
    .maybeSingle()
  if (selectionsQueryError) {
    console.error(selectionsQueryError);
    return;
  }

  if (waitlist)
    return selectionsQuery.waitlisted_by;
  return selectionsQuery.selected_by;

}

async function getDevInfo(fake_name: string) {
  const { data: selectionsQuery, error: selectionsQueryError } = await supabase
    .from("pmtl_application_data")
    .select(`*, dev_selections(selected_by)`)
    .eq("fake_name", fake_name)
    .maybeSingle()
  if (selectionsQueryError) {
    console.error(selectionsQueryError);
    return;
  }
  return selectionsQuery;

}

const RANKING_IDX = 0; const SELECT_IDX = 0; const SELECTED_BY_IDX = 1;
const WAITLIST_BY_IDX = 2;
const DeveloperSelectionTable: any = (props: DevSelectionTableProps) => {
  const [realtimeData, setRealtimeData] = useState<DataType[]>(props.data);
  const supabase = createClient(props.supabaseUrl, props.supabaseAnonKey);

  async function selectDev(fake_name: string) {
    const currentSelections = await getSelectionsOnDev(supabase, fake_name, false);
    if (currentSelections !== null) {
      let newSelections = "";
      if (!currentSelections) {
        newSelections = props.team;
      }
      else if (currentSelections.includes(props.team)) {
        return;
      }
      else {
        newSelections = currentSelections + "," + props.team
      }
      const { error: teamSelError } = await supabase
        .from("dev_selections")
        .update({ selected_by: newSelections })
        .eq("fake_name", fake_name)
      if (teamSelError) {
        console.error(teamSelError);
      }
    }
  }

  async function unselectDev(fake_name: string) {
    const currentSelections = await getSelectionsOnDev(supabase, fake_name, false);
    if (currentSelections !== null) {
      let newSelections = currentSelections.replace("," + props.team, "").replace(props.team, "");
      if (newSelections.startsWith(",")) {
        newSelections = newSelections.substring(1);
      }

      const { error: teamSelError } = await supabase
        .from("dev_selections")
        .update({ selected_by: newSelections })
        .eq("fake_name", fake_name)
      if (teamSelError) {
        console.error(teamSelError);
      }
    }
  }

  async function waitlistDev(fake_name: string) {
    const currentSelections = await getSelectionsOnDev(supabase, fake_name, true);
    if (currentSelections !== null) {
      let newSelections = "";
      if (!currentSelections) {
        newSelections = props.team;
      }
      else if (currentSelections.includes(props.team)) {
        return;
      }
      else {
        newSelections = currentSelections + "," + props.team
      }
      const { error: teamSelError } = await supabase
        .from("dev_selections")
        .update({ waitlisted_by: newSelections })
        .eq("fake_name", fake_name)
      if (teamSelError) {
        console.error(teamSelError);
      }
    }
  }

  async function unwaitlistDev(fake_name: string) {
    const currentSelections = await getSelectionsOnDev(supabase, fake_name, true);
    if (currentSelections !== null) {
      let newSelections = currentSelections.replace("," + props.team, "").replace(props.team, "");
      if (newSelections.startsWith(",")) {
        newSelections = newSelections.substring(1);
      }

      const { error: teamSelError } = await supabase
        .from("dev_selections")
        .update({ waitlisted_by: newSelections })
        .eq("fake_name", fake_name)
      if (teamSelError) {
        console.error(teamSelError);
      }
    }
  }

  async function initSupabase(setRealtimeData: any, accessToken: { value: string }, refreshToken: { value: string }) {
    if (!accessToken || !refreshToken)
      return;
    const { error: authError } = await supabase.auth.setSession({
      refresh_token: refreshToken.value,
      access_token: accessToken.value,
    });
    if (authError) {
      console.error(authError)
      return;
    }

    supabase
      .channel(props.channel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dev_selections' },
        async (payload) => {
          const fake_name = (payload.new as any).fake_name;
          const teamInSelectedBy = (payload.new as any).selected_by.includes(props.team);
          const index = realtimeData.findIndex(item => item.fake_name === fake_name);

          if (index > -1) {
            // Update the record if it exists in the state
            setRealtimeData((currentData: any) => {
              const updatedData = [...currentData];
              updatedData[index] = {
                ...updatedData[index],
                dev_selections: { 
                  selected_by: (payload.new as any).selected_by,
                  waitlisted_by: (payload.new as any).waitlisted_by
                }
              };
              return updatedData;
            });
          }
        }
      )
      .subscribe();

  }

  useEffect(() => {
    // Create columns based on team names (this part remains the same)
    if (columns[RANKING_IDX]?.title !== "Ranking") {
      columns.splice(RANKING_IDX, 0,
        {
          title: "Ranking",
          dataIndex: "rank_" + props.team,
          key: "rank_" + props.team,
          sorter: {
            compare: (a: any, b: any) => (a["rank_" + props.team]) - (b["rank_" + props.team])
          },
          filters: rankFilters,
          onFilter: (val: any, record: any) => (record["rank_" + props.team]) === val,
        }
      );
    }

    if (columns[SELECT_IDX]?.title !== "Select") {
      columns.splice(SELECT_IDX, 0, {
        title: 'Select',
        dataIndex: 'select',
        key: 'select',
        render: (_, { dev_selections, fake_name }) => (
          <>
            {dev_selections.selected_by && dev_selections.selected_by.includes(props.team) ? (
              <Button
                size="small"
                shape="round"
                type="primary"
                onClick={() => unselectDev(fake_name)}
                danger
              >
                Unselect
              </Button>
            ) : (
              <Button
                size="small"
                shape="round"
                type="primary"
                onClick={() => selectDev(fake_name)}
              >
                Select
              </Button>
            )}

            <div className='my-2' />
        
            {dev_selections.waitlisted_by && dev_selections.waitlisted_by.includes(props.team) ? (
              <Button
                size="small"
                shape="round"
                type="primary"
                onClick={() => unwaitlistDev(fake_name)}
                danger
              >
                Un-Waitlist
              </Button>
            ) : (
              <Button
                size="small"
                shape="round"
                type="primary"
                onClick={() => waitlistDev(fake_name)}
              >
                Waitlist
              </Button>
            )}
          </>
        )
        

      });

      if (columns[SELECTED_BY_IDX]?.title !== "Selected By") {
        columns.splice(SELECTED_BY_IDX, 0,
          {
            title: "Selected By",
            dataIndex: "selected_by",
            key: "selected_by",
            filters: [{ text: "Selected by " + props.team, value: props.team }],
            onFilter: (val: any, record: any) => {
              return record.dev_selections.selected_by.indexOf(props.team) > -1
            },
            render: (_, { dev_selections }) => <p>{dev_selections.selected_by}</p>,
            sorter: {
              compare: (a: any, b: any) => (b.dev_selections.selected_by.indexOf(props.team)) - (a.dev_selections.selected_by.indexOf(props.team))
            },
          }
        );
      }

      if (columns[WAITLIST_BY_IDX]?.title !== "Waitlisted By") {
        columns.splice(WAITLIST_BY_IDX, 0,
          {
            title: "Waitlisted By",
            dataIndex: "waitlisted_by",
            key: "waitlisted_by",
            filters: [{ text: "Waitlisted by " + props.team, value: props.team }],
            onFilter: (val: any, record: any) => {
              return record.dev_selections.waitlisted_by.indexOf(props.team) > -1
            },
            render: (_, { dev_selections }) => <p>{dev_selections.waitlisted_by}</p>,
            sorter: {
              compare: (a: any, b: any) => (b.dev_selections.waitlisted_by.indexOf(props.team)) - (a.dev_selections.waitlisted_by.indexOf(props.team))
            },
          }
        );
      }


    }

    // Initialize Supabase real-time connection and pass setRealtimeData to handle updates
    initSupabase(setRealtimeData, props.accessToken, props.refreshToken);

    return () => {
      // Add cleanup logic for the subscription if necessary
    };
  }, []);


  const rankFilters = [...Array(12).keys()].map(x => { return { key: x, text: x + 1, value: x + 1 } });

  function renderEssays(entry: DataType) {
    const essays = [
      {
        question: "Why do you want to join JumboCode? What do you hope to gain by joining the club?",
        response: entry.why_join_jumbocode
      },
      {
        question: "What's your experience with volunteering, working with non-profits, community engagement, and/or social good activism?",
        response: entry.volunteering_experience
      },
      {
        question: "What's your availability for a one-hour weekly team meeting?",
        response: entry.weekly_meeting_availability
      },
      {
        question: "Have you been a part of JumboCode before? If so, what project(s)?",
        response: entry.jumbocode_previous_projects
      },
      {
        question: "CS Classes Taken",
        response: entry.classes_taken
      },
      {
        question: "What was your first introduction to computer science?",
        response: entry.intro_to_cs
      },
      {
        question: "Tell us about a project you're proud of",
        response: entry.project_proud_of
      },
      {
        question: "Project Preference Elaboration",
        response: entry.preferences_elaboration
      },
      {
        question: "Is there anything else you want to add/want us to know?",
        response: entry.additional_info
      },
    ]

    return essays.map((essay) =>
      <>
        <div className='border-4 rounded border-gray-200 m-1 my-2 p-2'>
          <p className='font-semibold text-md mb-2'>{essay.question}</p>
          <p className='mb-2'>{essay.response}</p>
        </div>
      </>
    )
  }


  return (
    <Table
      rowClassName={(record, index) => {
        if (record.dev_selections.selected_by === "") {
          return "bg-white -my-2";
        }
        if (record.dev_selections.selected_by.replaceAll(",", "").trim() === props.team) {
          return "bg-green-100 -my-2";
        }
        return "bg-orange-100 -my-2";
      }}
      columns={columns}
      expandable={{
        expandedRowRender: (record) =>
          <div className="max-w-96 md:max-w-screen-sm lg:max-w-screen-md xl:max-w-screen-lg">
            {renderEssays(record)}
          </div>,
        rowExpandable: () => true,
      }}
      dataSource={realtimeData}  // Use realtimeData here
      scroll={{ x: "max-content" }}
    />
  );


};

export default DeveloperSelectionTable;