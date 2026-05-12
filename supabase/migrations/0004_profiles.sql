create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  icon_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (display_name)
select 'JM'
where not exists (
  select 1 from public.profiles where display_name = 'JM'
);

alter table public.visits
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

alter table public.menu_photos
  add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null;

alter table public.menu_annotations
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

update public.visits
set profile_id = (select id from public.profiles where display_name = 'JM' order by created_at limit 1)
where profile_id is null;

update public.menu_photos
set owner_profile_id = (select id from public.profiles where display_name = 'JM' order by created_at limit 1)
where owner_profile_id is null;

update public.menu_annotations
set profile_id = (select id from public.profiles where display_name = 'JM' order by created_at limit 1)
where profile_id is null;

alter table public.visits
  alter column profile_id set not null;

alter table public.menu_photos
  alter column owner_profile_id set not null;

alter table public.menu_annotations
  alter column profile_id set not null;

create index if not exists visits_profile_id_idx on public.visits (profile_id);
create index if not exists menu_photos_owner_profile_id_idx on public.menu_photos (owner_profile_id);
create index if not exists menu_annotations_profile_id_idx on public.menu_annotations (profile_id);
