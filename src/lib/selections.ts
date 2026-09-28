export type SelectionType = "selected" | "waitlisted" | "saved";

export interface DeveloperSelection {
  fake_name?: string;
  team_name: string;
  selection_type: SelectionType;
  created_by: string | null;
  created_at: string;
}

export interface Application {
  key: string | number;
  fake_name: string;
  board_notes: string | null;
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

// Submission rules enforced by submit_team_selections in the database.
export const SELECTED_RANGE = { min: 10, max: 12 };
export const WAITLISTED_RANGE = { min: 1, max: 3 };

export function selectionsFor(record: Application): DeveloperSelection[] {
  return Array.isArray(record.developer_selections)
    ? record.developer_selections
    : [];
}

export function selectionForTeam(
  record: Application,
  team: string,
): DeveloperSelection | undefined {
  return selectionsFor(record).find((selection) => selection.team_name === team);
}

export function teamsForType(record: Application, type: SelectionType): string[] {
  return selectionsFor(record)
    .filter((selection) => selection.selection_type === type)
    .map((selection) => selection.team_name)
    .sort();
}

export function replaceSelection(
  record: Application,
  nextSelection: DeveloperSelection,
): Application {
  const nextSelections = selectionsFor(record).filter(
    (selection) => selection.team_name !== nextSelection.team_name,
  );
  nextSelections.push(nextSelection);
  return { ...record, developer_selections: nextSelections };
}

export function removeSelection(record: Application, team: string): Application {
  return {
    ...record,
    developer_selections: selectionsFor(record).filter(
      (selection) => selection.team_name !== team,
    ),
  };
}

// Pronoun answers are free text ("He/Him", "he him", "she/her/hers", ...).
export function normalizePronouns(value: string | null | undefined): string {
  const first = (value ?? "").trim().toLowerCase().split(/[\s/,]+/)[0];
  if (first === "he") return "he/him";
  if (first === "she") return "she/her";
  if (first === "they") return "they/them";
  return "Other / unspecified";
}
