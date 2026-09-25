-- Local development logins only. `supabase start` / `supabase db reset` runs
-- this after the migrations. Every account's password is "password123".
--   board@test.local         Board, scoped to every team
--   <team_slug>@test.local   Team lead for that team, e.g. just_a_start@test.local
--
-- One DO block because the CLI prepares every statement in the file before
-- running any of them.
do $$
begin
  create temporary table seed_accounts on commit drop as
  select
    team_name || '@test.local' as email,
    'Team Lead' as role,
    team_name,
    initcap(replace(team_name, '_', ' ')) || ' Lead' as first_name
  from public.team_status
  union all
  select 'board@test.local', 'Board', 'Board', 'Board Tester';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
    'authenticated', email, crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  from seed_accounts;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  select
    gen_random_uuid(), users.id::text, users.id,
    jsonb_build_object('sub', users.id::text, 'email', users.email),
    'email', now(), now(), now()
  from auth.users
  join seed_accounts on seed_accounts.email = users.email;

  insert into public.user_roles (email, role, team_name, first_name)
  select email, role, team_name, first_name from seed_accounts;

  insert into public.board_selection_scopes (board_email, team_name)
  select 'board@test.local', team_name from public.team_status;
end;
$$;
