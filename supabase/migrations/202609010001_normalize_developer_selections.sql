begin;

create type public.developer_selection_type as enum ('selected', 'waitlisted');

create table public.developer_selections (
  fake_name text not null
    references public.pmtl_application_data (fake_name) on delete cascade,
  team_name text not null
    references public.team_status (team_name) on update cascade on delete cascade,
  selection_type public.developer_selection_type not null,
  created_by uuid default auth.uid()
    references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (fake_name, team_name)
);

comment on table public.developer_selections is
  'One row per developer/team selection. A row is either selected or waitlisted.';
comment on column public.developer_selections.created_by is
  'The auth user that last set the selection. NULL is reserved for migrated legacy rows.';

create index developer_selections_team_type_idx
  on public.developer_selections (team_name, selection_type);

-- Board access is explicit. The backfill preserves the old behavior by giving
-- every current Board user access to every current team; administrators can
-- narrow or extend these rows later with the service role.
create table public.board_selection_scopes (
  board_email text not null
    references public.user_roles (email) on update cascade on delete cascade,
  team_name text not null
    references public.team_status (team_name) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_email, team_name)
);

insert into public.board_selection_scopes (board_email, team_name)
select user_roles.email, team_status.team_name
from public.user_roles
cross join public.team_status
where user_roles.team_name = 'Board'
on conflict do nothing;

-- Fail loudly rather than silently discarding a misspelled legacy team during
-- the comma-separated-data backfill.
do $$
declare
  unknown_teams text;
begin
  select string_agg(team_name, ', ' order by team_name)
  into unknown_teams
  from (
    select distinct btrim(team_name) as team_name
    from public.dev_selections
    cross join lateral regexp_split_to_table(
      concat_ws(',', selected_by, waitlisted_by),
      ','
    ) as legacy_team(team_name)
    where btrim(team_name) <> ''
  ) legacy_teams
  where not exists (
    select 1
    from public.team_status
    where team_status.team_name = legacy_teams.team_name
  );

  if unknown_teams is not null then
    raise exception 'Cannot migrate unknown team names: %', unknown_teams;
  end if;
end;
$$;

insert into public.developer_selections (
  fake_name,
  team_name,
  selection_type,
  created_by
)
select
  dev_selections.fake_name,
  btrim(team_name),
  'selected'::public.developer_selection_type,
  null
from public.dev_selections
cross join lateral regexp_split_to_table(dev_selections.selected_by, ',') as legacy_team(team_name)
where btrim(team_name) <> ''
on conflict (fake_name, team_name) do nothing;

-- If corrupt legacy data contains the same team in both lists, selected wins.
insert into public.developer_selections (
  fake_name,
  team_name,
  selection_type,
  created_by
)
select
  dev_selections.fake_name,
  btrim(team_name),
  'waitlisted'::public.developer_selection_type,
  null
from public.dev_selections
cross join lateral regexp_split_to_table(dev_selections.waitlisted_by, ',') as legacy_team(team_name)
where btrim(team_name) <> ''
on conflict (fake_name, team_name) do nothing;

alter table public.developer_selections enable row level security;
alter table public.board_selection_scopes enable row level security;
alter table public.developer_selections replica identity full;

create or replace function public.current_user_is_team_member(p_team_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where lower(user_roles.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and user_roles.team_name = p_team_name
      and p_team_name <> 'Board'
  );
$$;

create or replace function public.current_user_is_scoped_board(p_team_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    join public.board_selection_scopes
      on board_selection_scopes.board_email = user_roles.email
    where lower(user_roles.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and user_roles.team_name = 'Board'
      and board_selection_scopes.team_name = p_team_name
  );
$$;

create or replace function public.current_user_can_manage_selections(p_team_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_status
    where team_status.team_name = p_team_name
      and (
        (
          team_status.status = 'In Progress'
          and public.current_user_is_team_member(p_team_name)
        )
        or (
          team_status.status in ('In Progress', 'Under Review')
          and public.current_user_is_scoped_board(p_team_name)
        )
      )
  );
$$;

create policy "Authenticated users can read developer selections"
  on public.developer_selections
  for select
  to authenticated
  using (true);

create policy "Authorized users can insert developer selections"
  on public.developer_selections
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.current_user_can_manage_selections(team_name)
  );

create policy "Authorized users can update developer selections"
  on public.developer_selections
  for update
  to authenticated
  using (public.current_user_can_manage_selections(team_name))
  with check (
    created_by = auth.uid()
    and public.current_user_can_manage_selections(team_name)
  );

create policy "Authorized users can delete developer selections"
  on public.developer_selections
  for delete
  to authenticated
  using (public.current_user_can_manage_selections(team_name));

create policy "Board users can read their selection scopes"
  on public.board_selection_scopes
  for select
  to authenticated
  using (
    lower(board_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create or replace function public.set_developer_selection(
  p_fake_name text,
  p_team_name text,
  p_selection_type public.developer_selection_type
)
returns public.developer_selections
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_state text;
  result public.developer_selections;
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

  if not public.current_user_can_manage_selections(p_team_name) then
    raise exception using
      errcode = '42501',
      message = 'You cannot modify selections for this team in its current state';
  end if;

  insert into public.developer_selections (
    fake_name,
    team_name,
    selection_type,
    created_by,
    created_at
  )
  values (
    p_fake_name,
    p_team_name,
    p_selection_type,
    auth.uid(),
    now()
  )
  on conflict (fake_name, team_name) do update
  set selection_type = excluded.selection_type,
      created_by = excluded.created_by,
      created_at = excluded.created_at
  returning * into result;

  return result;
end;
$$;

create or replace function public.remove_developer_selection(
  p_fake_name text,
  p_team_name text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_state text;
  removed_count integer;
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

  if not public.current_user_can_manage_selections(p_team_name) then
    raise exception using
      errcode = '42501',
      message = 'You cannot modify selections for this team in its current state';
  end if;

  delete from public.developer_selections
  where fake_name = p_fake_name
    and team_name = p_team_name;

  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

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

  if selected_count <> 10 then
    raise exception using
      errcode = '23514',
      message = format('Select exactly 10 developers before submitting (currently %s)', selected_count);
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

  if selected_count <> 10 or waitlisted_count < 1 or waitlisted_count > 3 then
    raise exception using
      errcode = '23514',
      message = format(
        'Approval requires exactly 10 selected and 1 to 3 waitlisted developers (currently %s and %s)',
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

-- All writes go through the locking functions above. The RLS write policies
-- remain as defense in depth if direct grants are intentionally restored.
revoke insert, update, delete on public.developer_selections from anon, authenticated;
revoke insert, update, delete on public.board_selection_scopes from anon, authenticated;
revoke insert, update, delete on public.team_status from anon, authenticated;
revoke insert, update, delete on public.dev_selections from anon, authenticated;

grant select on public.developer_selections to authenticated;
grant select on public.board_selection_scopes to authenticated;

revoke all on function public.current_user_is_team_member(text) from public, anon;
revoke all on function public.current_user_is_scoped_board(text) from public, anon;
revoke all on function public.current_user_can_manage_selections(text) from public, anon;
revoke all on function public.set_developer_selection(text, text, public.developer_selection_type) from public, anon;
revoke all on function public.remove_developer_selection(text, text) from public, anon;
revoke all on function public.submit_team_selections() from public, anon;
revoke all on function public.approve_team_selections(text) from public, anon;

grant execute on function public.current_user_is_team_member(text) to authenticated;
grant execute on function public.current_user_is_scoped_board(text) to authenticated;
grant execute on function public.current_user_can_manage_selections(text) to authenticated;
grant execute on function public.set_developer_selection(text, text, public.developer_selection_type) to authenticated;
grant execute on function public.remove_developer_selection(text, text) to authenticated;
grant execute on function public.submit_team_selections() to authenticated;
grant execute on function public.approve_team_selections(text) to authenticated;

drop policy if exists "Enable update for users" on public.dev_selections;
drop policy if exists "Enable update for authenticated users only" on public.team_status;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'developer_selections'
  ) then
    alter publication supabase_realtime add table public.developer_selections;
  end if;
end;
$$;

commit;
