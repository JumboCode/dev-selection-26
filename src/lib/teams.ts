export interface TeamMember {
  first_name: string | null;
  role: string;
  headshot_url: string | null;
}

export interface TeamInfo {
  team_name: string;
  display_name: string | null;
  status: string;
  members: TeamMember[];
}

// Fallback for teams without a display_name, e.g. "just_a_start" -> "Just A Start".
export function humanizeTeamName(teamName: string): string {
  return teamName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function teamLabel(
  teamName: string,
  displayName?: string | null,
): string {
  return displayName?.trim() || humanizeTeamName(teamName);
}

interface TeamRow {
  team_name: string;
  display_name?: string | null;
  status: string;
}

interface MemberRow extends TeamMember {
  team_name: string | null;
}

export function buildTeamDirectory(
  teams: TeamRow[] | null,
  members: MemberRow[] | null,
): TeamInfo[] {
  return (teams ?? [])
    .map((team) => ({
      team_name: team.team_name,
      display_name: teamLabel(team.team_name, team.display_name),
      status: team.status,
      members: (members ?? [])
        .filter((member) => member.team_name === team.team_name)
        .map(({ first_name, role, headshot_url }) => ({
          first_name,
          role,
          headshot_url,
        })),
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}
