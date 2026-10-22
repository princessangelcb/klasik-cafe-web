-- Klasik Cafe profile repair
-- Run in Supabase Dashboard > SQL Editor against the same project used by js/supabase.js.

-- Create the app's profile table if it does not exist, then ensure the columns
-- used by this app and the signup trigger are present.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  full_name text,
  username text,
  role text not null default 'customer',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists full_name text,
  add column if not exists username text,
  add column if not exists role text not null default 'customer',
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles enable row level security;

-- Backfill existing Auth users that do not yet have a profile. Existing roles
-- and profile values are left alone.
insert into public.profiles (id, email, first_name, last_name, full_name, username, role)
select
  u.id,
  u.email,
  nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(concat_ws(' ',
      nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'last_name'), '')
    )), '')
  ),
  nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
  'customer'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- Create/update the signup handler. Role is always customer for public signup;
-- staff roles must be assigned by a trusted admin process.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_name_value text;
  last_name_value text;
begin
  first_name_value := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  last_name_value := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');

  insert into public.profiles (id, email, first_name, last_name, full_name, username, role)
  select
    new.id,
    new.email,
    first_name_value,
    last_name_value,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(concat_ws(' ', first_name_value, last_name_value)), '')
    ),
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    'customer'
  where not exists (
    select 1 from public.profiles p where p.id = new.id
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- The signed-in user may read their own profile for dashboard routing.
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);
