begin;

-- 2026-27 selection cycle. Team slugs are team_status.team_name, the
-- /dev-selection/<team> URL, and the rank_<team> column suffix, so they must
-- stay in sync with short_column_names in scripts/parse_application_data.py.
create temporary table new_cycle_teams (team_name text primary key) on commit drop;
insert into new_cycle_teams (team_name) values
  ('damiens_place'),
  ('hearty_meals_for_all'),
  ('massachusetts_river_alliance'),
  ('african_bridge_network'),
  ('somerville_media_center'),
  ('just_a_start'),
  ('teen_empowerment'),
  ('mystic_learning_center');

-- Replace the previous cycle's ranking columns. Application rows themselves are
-- replaced by the import script, and the prior data remains in the 2024 backup.
do $$
declare
  old_rank_column text;
begin
  for old_rank_column in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pmtl_application_data'
      and column_name like 'rank\_%'
      and substring(column_name from 6) not in (select team_name from new_cycle_teams)
  loop
    execute format(
      'alter table public.pmtl_application_data drop column %I',
      old_rank_column
    );
  end loop;
end;
$$;

alter table public.pmtl_application_data
  add column if not exists rank_damiens_place bigint,
  add column if not exists rank_hearty_meals_for_all bigint,
  add column if not exists rank_massachusetts_river_alliance bigint,
  add column if not exists rank_african_bridge_network bigint,
  add column if not exists rank_somerville_media_center bigint,
  add column if not exists rank_just_a_start bigint,
  add column if not exists rank_teen_empowerment bigint,
  add column if not exists rank_mystic_learning_center bigint,
  add column if not exists weekly_meeting_availability text,
  add column if not exists previous_jumbocode_developer text,
  add column if not exists devops_interest text,
  add column if not exists favorite_development_aspect text,
  add column if not exists mentorship_interest text,
  drop column if exists jumbocode_previous_projects;

-- Removing a previous cycle's team cascades to its developer_selections and
-- board_selection_scopes rows.
delete from public.team_status
where team_name not in (select team_name from new_cycle_teams);

insert into public.team_status (team_name, status)
select team_name, 'In Progress'
from new_cycle_teams
on conflict (team_name) do update set status = 'In Progress';

-- Keep the original default: every Board user can review every team.
insert into public.board_selection_scopes (board_email, team_name)
select user_roles.email, new_cycle_teams.team_name
from public.user_roles
cross join new_cycle_teams
where user_roles.team_name = 'Board'
on conflict do nothing;

commit;
