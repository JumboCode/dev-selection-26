import React from 'react';
import { Button, Space, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { teamLabel } from '../lib/teams';

interface DataType {
  team_name: string;
  display_name?: string | null;
  status: string;
}

interface StatusTableProps {
  rows: DataType[]
}

const columns: TableProps<DataType>['columns'] = [
  {
    title: 'Project Name',
    dataIndex: 'team_name',
    key: 'team_name',
    render: (_, { team_name, display_name }) => teamLabel(team_name, display_name),
  },
  {
    title: 'Dev Selection Status',
    key: 'status',
    dataIndex: 'status',
    render: (_, { status }) => {
      let color = '';
      switch (status) {
        case 'In Progress':
          color = 'geekblue';
          break;
        case 'Complete':
          color = 'green';
          break;
        case 'Under Review':
          color = 'orange';
          break;
        default:
          color = 'red';
      }
      return (
        <Tag color={color} key={status}>
          {status.toUpperCase()}
        </Tag>
      );
    },
  },
  {
    title: 'View Dev Selections',
    key: 'dev_selections',
    render: (_, { status, team_name }) => (
      <Space size="middle">
        <Button type="primary" href={"/dev-selection/" + team_name} disabled={status === "Complete"}>
          View/Select Developers
        </Button>
      </Space>
    ),
  },
];

const StatusTable: React.FC<StatusTableProps> = (props) => <Table rowKey="team_name" columns={columns} dataSource={props.rows} scroll={{ x: "max-content" }} />;

export default StatusTable;
