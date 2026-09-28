import { useState } from "react";
import { Button, Table } from "antd";
import type { TableColumnsType } from "antd";

export interface ConfirmedDeveloper {
  team_name: string;
  team_label: string;
  fake_name: string;
  full_name: string;
  email: string | null;
  pronouns: string | null;
  class_year: string | null;
}

interface ConfirmedRosterProps {
  rows: ConfirmedDeveloper[];
  showTeam: boolean;
}

const ConfirmedRoster = (props: ConfirmedRosterProps) => {
  const [copied, setCopied] = useState(false);

  if (props.rows.length === 0) {
    return (
      <p className="text-gray-500">
        Real names and emails appear here once the Board approves a team's
        selections.
      </p>
    );
  }

  const columns: TableColumnsType<ConfirmedDeveloper> = [
    ...(props.showTeam
      ? [
          {
            title: "Project",
            dataIndex: "team_label",
            key: "team_label",
            filters: [...new Set(props.rows.map((row) => row.team_label))].map(
              (label) => ({ text: label, value: label }),
            ),
            onFilter: (value: unknown, row: ConfirmedDeveloper) => row.team_label === value,
          },
        ]
      : []),
    { title: "Name", dataIndex: "full_name", key: "full_name" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Pronouns", dataIndex: "pronouns", key: "pronouns" },
    { title: "Class Year", dataIndex: "class_year", key: "class_year" },
    { title: "Fake Name", dataIndex: "fake_name", key: "fake_name" },
  ];

  async function copyEmails() {
    const emails = props.rows
      .map((row) => row.email)
      .filter(Boolean)
      .join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy these emails:", emails);
    }
  }

  return (
    <div>
      <Button className="mb-4" onClick={copyEmails}>
        {copied ? "Copied!" : `Copy all ${props.rows.length} emails`}
      </Button>
      <Table
        rowKey={(row) => `${row.team_name}:${row.fake_name}`}
        columns={columns}
        dataSource={props.rows}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

export default ConfirmedRoster;
