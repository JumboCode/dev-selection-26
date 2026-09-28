begin;

-- Teams may submit 10 to 12 selected developers (previously exactly 10).
-- The waitlist stays at 1 to 3. CREATE OR REPLACE keeps the existing grants.

create or replace function public.submit_team_selections()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_team text;
  team_state text;
  selected_count integer;
  waitlisted_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select team_name
  into caller_team
  from public.user_roles
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and team_name is not null
    and team_name <> 'Board';

  if not found then
    raise exception using errcode = '42501', message = 'A project team membership is required';
  end if;

  select status
  into team_state
  from public.team_status
  where team_name = caller_team
  for update;

  if team_state <> 'In Progress' then
    raise exception using
      errcode = '55000',
      message = 'Only selections that are In Progress can be submitted';
  end if;

  select
    count(*) filter (where selection_type = 'selected'),
    count(*) filter (where selection_type = 'waitlisted')
  into selected_count, waitlisted_count
  from public.developer_selections
  where team_name = caller_team;

  if selected_count < 10 or selected_count > 12 then
    raise exception using
      errcode = '23514',
      message = format('Select 10 to 12 developers before submitting (currently %s)', selected_count);
  end if;

  if waitlisted_count < 1 or waitlisted_count > 3 then
    raise exception using
      errcode = '23514',
      message = format('Waitlist 1 to 3 developers before submitting (currently %s)', waitlisted_count);
  end if;

  update public.team_status
  set status = 'Under Review'
  where team_name = caller_team;

  return caller_team;
end;
$$;

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

  update public.team_status
  set status = 'Complete'
  where team_name = p_team_name;

  return p_team_name;
end;
$$;

commit;
