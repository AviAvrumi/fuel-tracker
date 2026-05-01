-- Israeli vehicle registry table for license-plate lookup
create table if not exists public.vehicle_registry_il (
  mispar_rechev text primary key,
  tozeret_nm text,
  degem_nm text,
  kinuy_mishari text,
  shnat_yitzur text,
  sug_delek_nm text
);

create index if not exists vehicle_registry_il_plate_idx
  on public.vehicle_registry_il (mispar_rechev);

alter table public.vehicle_registry_il enable row level security;

drop policy if exists "vehicle_registry_il_select_all" on public.vehicle_registry_il;
create policy "vehicle_registry_il_select_all"
on public.vehicle_registry_il
for select
using (true);

-- Import example (run from psql):
-- \copy public.vehicle_registry_il(mispar_rechev,tozeret_nm,degem_nm,kinuy_mishari,shnat_yitzur,sug_delek_nm)
-- from 'C:/Users/temp/Downloads/053cea08-09bc-40ec-8f7a-156f0677aff3 (1).csv'
-- with (format csv, header true, delimiter '|', quote '"');
