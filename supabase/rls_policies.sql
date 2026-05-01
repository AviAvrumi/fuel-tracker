-- Enable Row Level Security
alter table if exists public.profiles enable row level security;
alter table if exists public.fuel_entries enable row level security;
alter table if exists public.vehicle_registry_il enable row level security;

-- Profiles: each user can only access their own profile row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Fuel entries: each user can only access their own records
drop policy if exists "fuel_entries_select_own" on public.fuel_entries;
create policy "fuel_entries_select_own"
on public.fuel_entries
for select
using (auth.uid() = user_id);

drop policy if exists "fuel_entries_insert_own" on public.fuel_entries;
create policy "fuel_entries_insert_own"
on public.fuel_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists "fuel_entries_update_own" on public.fuel_entries;
create policy "fuel_entries_update_own"
on public.fuel_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "fuel_entries_delete_own" on public.fuel_entries;
create policy "fuel_entries_delete_own"
on public.fuel_entries
for delete
using (auth.uid() = user_id);

-- Vehicle registry: allow read-only lookup for license plate enrichment
drop policy if exists "vehicle_registry_il_select_all" on public.vehicle_registry_il;
create policy "vehicle_registry_il_select_all"
on public.vehicle_registry_il
for select
using (true);
