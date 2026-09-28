begin;

-- Readable project names for the UI. team_name stays the slug used in URLs
-- and rank_<team> columns.
alter table public.team_status add column if not exists display_name text;

update public.team_status as team_status
set display_name = names.display_name
from (values
  ('damiens_place', 'Damien''s Place'),
  ('hearty_meals_for_all', 'Hearty Meals for All'),
  ('massachusetts_river_alliance', 'Massachusetts River Alliance'),
  ('african_bridge_network', 'African Bridge Network'),
  ('somerville_media_center', 'Somerville Media Center'),
  ('just_a_start', 'Just a Start'),
  ('teen_empowerment', 'Teen Empowerment'),
  ('mystic_learning_center', 'Mystic Learning Center')
) as names (team_name, display_name)
where team_status.team_name = names.team_name
  and team_status.display_name is null;

-- Optional headshot shown in the team directory (any public image URL).
alter table public.user_roles add column if not exists headshot_url text;

-- The team directory is shown to signed-in users only; don't expose team
-- member names and emails to the anonymous key.
drop policy if exists "Enable read access for all users" on public.user_roles;
create policy "Authenticated users can read user roles"
  on public.user_roles for select to authenticated using (true);

-- Approval now records each selected developer's team in confirmed_team so
-- their real name and email can be revealed to that team. A developer can be
-- confirmed to only one team: approval is refused while any selected developer
-- is already confirmed elsewhere, until the Board resolves it.
create or replace function public.approve_team_selections(p_team_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_state text;
  selected_count integer;
  waitlisted_count integer;
  conflicts text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select status
  into team_state
  from public.team_status
  where team_name = p_team_name
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Unknown team';
  end if;

  if not public.current_user_is_scoped_board(p_team_name) then
    raise exception using errcode = '42501', message = 'Board scope required';
  end if;

  if team_state <> 'Under Review' then
    raise exception using
      errcode = '55000',
      message = 'Only selections that are Under Review can be approved';
  end if;

  select
    count(*) filter (where selection_type = 'selected'),
    count(*) filter (where selection_type = 'waitlisted')
  into selected_count, waitlisted_count
  from public.developer_selections
  where team_name = p_team_name;

  if selected_count < 10 or selected_count > 12
    or waitlisted_count < 1 or waitlisted_count > 3 then
    raise exception using
      errcode = '23514',
      message = format(
        'Approval requires 10 to 12 selected and 1 to 3 waitlisted developers (currently %s and %s)',
        selected_count,
        waitlisted_count
      );
  end if;

  -- Lock the selected applicants so two approvals can't confirm the same
  -- developer to different teams.
  select string_agg(
    format('%s (%s)', applications.fake_name, applications.confirmed_team),
    ', ' order by applications.fake_name
  )
  into conflicts
  from (
    select pmtl.fake_name, pmtl.confirmed_team
    from public.pmtl_application_data as pmtl
    join public.developer_selections as selections
      on selections.fake_name = pmtl.fake_name
    where selections.team_name = p_team_name
      and selections.selection_type = 'selected'
    for update of pmtl
  ) as applications
  where coalesce(applications.confirmed_team, '') not in ('', p_team_name);

  if conflicts is not null then
    raise exception using
      errcode = '23505',
      message = format(
        'Already confirmed to another team: %s. Unselect them for this team before approving.',
        conflicts
      );
  end if;

  update public.pmtl_application_data as pmtl
  set confirmed_team = p_team_name
  from public.developer_selections as selections
  where selections.fake_name = pmtl.fake_name
    and selections.team_name = p_team_name
    and selections.selection_type = 'selected';

  update public.team_status
  set status = 'Complete'
  where team_name = p_team_name;

  return p_team_name;
end;
$$;

-- Real names and emails of confirmed developers. Team members see their own
-- team once it is Complete; Board users see every Complete team in their scope.
-- Nothing else can read sensitive_application_data through the API.
create or replace function public.get_confirmed_roster()
returns table (
  team_name text,
  fake_name text,
  full_name text,
  email text,
  pronouns text,
  class_year text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    team_status.team_name,
    pmtl.fake_name,
    sensitive.full_name,
    sensitive.email,
    pmtl.pronouns,
    pmtl.class_year
  from public.team_status
  join public.pmtl_application_data as pmtl
    on pmtl.confirmed_team = team_status.team_name
  join public.sensitive_application_data as sensitive
    on sensitive.fake_name = pmtl.fake_name
  where team_status.status = 'Complete'
    and (
      public.current_user_is_team_member(team_status.team_name)
      or public.current_user_is_scoped_board(team_status.team_name)
    )
  order by team_status.team_name, sensitive.full_name;
$$;

revoke all on function public.get_confirmed_roster() from public, anon;
grant execute on function public.get_confirmed_roster() to authenticated;

commit;
