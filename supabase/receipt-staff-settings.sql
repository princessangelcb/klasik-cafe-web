-- Receipt customization storage and admin-only update policies.
-- Staff are existing profiles rows with role = 'admin' or 'barista'.

create table if not exists public.receipt_settings (
  id integer primary key check (id = 1),
  store_header text not null default 'KLASIK CAFE',
  contact_details text not null default '',
  footer_text text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.receipt_settings (id) values (1) on conflict (id) do nothing;

alter table public.receipt_settings enable row level security;
drop policy if exists "Receipt details are readable" on public.receipt_settings;
create policy "Receipt details are readable" on public.receipt_settings
  for select to anon, authenticated using (true);

create or replace function public.is_klasik_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'); $$;
revoke all on function public.is_klasik_admin() from public;
grant execute on function public.is_klasik_admin() to authenticated;

drop policy if exists "Admins manage receipt details" on public.receipt_settings;
create policy "Admins manage receipt details" on public.receipt_settings
  for all to authenticated using (public.is_klasik_admin()) with check (public.is_klasik_admin());

-- Enables admin role edits/removal through profiles, subject to existing profiles RLS.
drop policy if exists "Admins update staff profiles" on public.profiles;
create policy "Admins update staff profiles" on public.profiles
  for update to authenticated using (public.is_klasik_admin()) with check (public.is_klasik_admin());

drop policy if exists "Admins read staff profiles" on public.profiles;
create policy "Admins read staff profiles" on public.profiles
  for select to authenticated using (public.is_klasik_admin());

-- Allows each signed-in customer to maintain their own profile/settings page.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
