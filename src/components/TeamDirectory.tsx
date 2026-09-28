import { Avatar, Tag } from "antd";
import type { TeamInfo, TeamMember } from "../lib/teams";

function initials(name: string | null): string {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function MemberAvatar(props: { member: TeamMember; size?: number }) {
  return (
    <Avatar
      size={props.size ?? 40}
      src={props.member.headshot_url || undefined}
      alt={props.member.first_name ?? ""}
      className="bg-blue-500"
    >
      {initials(props.member.first_name)}
    </Avatar>
  );
}

// Compact "who to talk to" line for a team, e.g. in a tooltip.
export function teamMembersText(team: TeamInfo | undefined): string {
  if (!team || team.members.length === 0) return "No members listed";
  return team.members
    .map((member) => `${member.first_name ?? "Unknown"} (${member.role})`)
    .join(", ");
}

interface TeamDirectoryProps {
  teams: TeamInfo[];
  currentTeam?: string;
}

const TeamDirectory = (props: TeamDirectoryProps) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {props.teams.map((team) => (
      <div
        key={team.team_name}
        className={`rounded-lg border p-3 ${
          team.team_name === props.currentTeam
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-semibold">{team.display_name}</p>
          <Tag>{team.status}</Tag>
        </div>
        {team.members.length === 0 ? (
          <p className="text-sm text-gray-500">No members listed</p>
        ) : (
          <ul className="space-y-2">
            {team.members.map((member, index) => (
              <li key={index} className="flex items-center gap-2">
                <MemberAvatar member={member} />
                <div className="leading-tight">
                  <div>{member.first_name ?? "Unknown"}</div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    ))}
  </div>
);

export default TeamDirectory;
