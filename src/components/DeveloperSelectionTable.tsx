import React, { useEffect } from 'react';
import { Table } from 'antd';
import type { TableColumnsType } from 'antd';

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
}


interface DevSelectionTableProps {
  data: DataType[],
  team: string
}

const columns: TableColumnsType<DataType> = [
  { title: 'Fake Name', dataIndex: 'fake_name', key: 'fake_name' },
  { title: 'Board Notes', dataIndex: 'board_notes', key: 'board_notes' },
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
    onFilter: (val, record) => record.class_year === val || record.class_year === val.toString(),
    sorter: {
      compare: (a, b) => a.class_year - b.class_year
    },
  },
  {
    title: 'Underrespresented in STEM',
    dataIndex: 'underrepresented_group_in_stem',
    key: 'underrepresented_group_in_stem',
    filters: [{ text: "Yes", value: "Yes" }, { text: "No", value: "No" }],
    onFilter: (val, record) => record.underrepresented_group_in_stem === val
  },
  {
    title: 'In person this semester?', dataIndex: 'in_person_this_semester', key: 'in_person_this_semester', 
    filters: [{ text: "Yes", value: "Yes" }, { text: "No", value: "No" }],
    onFilter: (val, record) => record.in_person_this_semester === val
  },
  { title: 'In person next semester?', dataIndex: 'in_person_next_semester', key: 'in_person_next_semester',
    filters: [{text: "Yes", value: "Yes"}, {text: "No", value: "No"}],
    onFilter: (val, record) => record.in_person_next_semester === val
   },
  { title: 'Classes Taken', dataIndex: 'classes_taken', key: 'classes_taken' },
  { title: 'Familiar Technologies', dataIndex: 'technologies', key: 'technologies' },
  { title: 'Personal Portfolio/Other Links', dataIndex: 'links', key: 'links' },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: () => <a>Delete</a>,
  },
];


const DeveloperSelectionTable: React.FC = (props: DevSelectionTableProps) => {
  useEffect(() => {

    columns.unshift(
      {
        title: "Ranking",
        dataIndex: "rank_" + props.team,
        key: "rank_" + props.team,
        sorter: {
          compare: (a, b) => a["rank_" + props.team] - b["rank_" + props.team]
        },
        filters: rankFilters,
        onFilter: (val, record) => record["rank_" + props.team] === val
      }
    );
  }, [])
  const rankFilters = [...Array(12).keys()].map(x => { return { text: x + 1, value: x + 1 } });

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
        <p className='font-semibold text-md'>{essay.question}</p>
        <p className='mb-2'>{essay.response}</p>
      </>
    )
  }
  const essays = [
  ]

  return (
    <Table
      columns={columns}
      expandable={{
        expandedRowRender: (record) =>
          <div className="max-w-96 md:max-w-screen-sm lg:max-w-screen-md xl:max-w-screen-lg">
            {renderEssays(record)}
          </div>,
        rowExpandable: (record) => record.name !== 'Not Expandable',
      }}
      dataSource={props.data}
      scroll={{ x: "max-content" }}
    />);
};

export default DeveloperSelectionTable;