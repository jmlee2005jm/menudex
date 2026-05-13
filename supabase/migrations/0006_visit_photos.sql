create table if not exists public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists visit_photos_visit_id_idx on public.visit_photos (visit_id);
create index if not exists visit_photos_profile_id_idx on public.visit_photos (profile_id);
