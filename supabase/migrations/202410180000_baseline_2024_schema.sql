-- Baseline public schema as it existed in production on 2024-10-18
-- (db_cluster-18-10-2024@11-18-20.backup), so a fresh Supabase project can
-- apply the later migrations. Schema only; no application data. Guarded with
-- IF NOT EXISTS so it is a no-op on a database restored from that backup.
begin;

create table if not exists public.pmtl_application_data (
  board_notes text,
  pronouns text,
  class_year text,
  underrepresented_group_in_stem text,
  why_join_jumbocode text not null,
  volunteering_experience text,
  in_person_this_semester text,
  in_person_next_semester text,
  weekly_meeting_availability text,
  classes_taken text,
  technologies text,
  intro_to_cs text,
  project_proud_of text,
  links text,
  rank_wmcc bigint,
  rank_village_food_hub bigint,
  rank_wily_network bigint,
  rank_somerville_museum bigint,
  rank_dillar_academy bigint,
  rank_neip bigint,
  rank_lgbtq_senior_housing bigint,
  rank_lcs_tutoring bigint,
  rank_english_at_large bigint,
  rank_bread_and_roses bigint,
  rank_a2empowerment bigint,
  rank_tufts_general_counsel bigint,
  preferences_elaboration text,
  additional_info text,
  jumbocode_previous_projects text,
  fake_name text primary key,
  confirmed_team text
);

create table if not exists public.sensitive_application_data (
  fake_name text primary key,
  "timestamp" text not null,
  full_name text not null,
  email text,
  uncomfortable_with text,
  board_notes text not null default ''
);

create table if not exists public.team_status (
  team_name text primary key,
  status text not null default 'In Progress'
);

create table if not exists public.user_roles (
  email text primary key,
  role text not null,
  team_name text,
  first_name text
);

create table if not exists public.dev_selections (
  fake_name text primary key
    references public.pmtl_application_data (fake_name),
  selected_by text not null default '',
  waitlisted_by text not null default ''
);

alter table public.dev_selections replica identity full;

alter table public.pmtl_application_data enable row level security;
alter table public.sensitive_application_data enable row level security;
alter table public.team_status enable row level security;
alter table public.user_roles enable row level security;
alter table public.dev_selections enable row level security;

drop policy if exists "Enable read access for all authed users" on public.pmtl_application_data;
create policy "Enable read access for all authed users"
  on public.pmtl_application_data for select to authenticated using (true);

drop policy if exists "Enable read access for all authed users" on public.sensitive_application_data;
create policy "Enable read access for all authed users"
  on public.sensitive_application_data for select to authenticator using (true);

drop policy if exists "Enable insert for authenticated users only" on public.team_status;
create policy "Enable insert for authenticated users only"
  on public.team_status for select to authenticated using (true);

drop policy if exists "Enable update for authenticated users only" on public.team_status;
create policy "Enable update for authenticated users only"
  on public.team_status for update to authenticated using (true);

drop policy if exists "Enable read access for all users" on public.user_roles;
create policy "Enable read access for all users"
  on public.user_roles for select using (true);

drop policy if exists "Enable read access for all users" on public.dev_selections;
create policy "Enable read access for all users"
  on public.dev_selections for select to authenticated using (true);

drop policy if exists "Enable update for users" on public.dev_selections;
create policy "Enable update for users"
  on public.dev_selections for update to authenticated using (true);

commit;
