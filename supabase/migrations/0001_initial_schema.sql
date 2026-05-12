create type public.menu_coverage as enum ('unknown', 'partial', 'full');
create type public.annotation_type as enum ('highlight');
create type public.annotation_shape as enum ('rect', 'freehand');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'other');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  branch_name text,
  map_url text,
  notes text,
  menu_coverage public.menu_coverage not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  price integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  visited_at timestamptz not null,
  meal_type public.meal_type not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visit_menu_items (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  manual_menu_name text,
  rating numeric(2, 1) check (
    rating >= 0.5
    and rating <= 5
    and rating * 2 = floor(rating * 2)
  ),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_menu_item_has_name check (
    menu_item_id is not null or manual_menu_name is not null
  )
);

create table public.menu_annotations (
  id uuid primary key default gen_random_uuid(),
  menu_photo_id uuid not null references public.menu_photos(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  tried_menu_id uuid references public.visit_menu_items(id) on delete set null,
  type public.annotation_type not null default 'highlight',
  shape public.annotation_shape not null default 'rect',
  color text not null default '#facc15',
  opacity numeric(3, 2) not null default 0.45 check (opacity >= 0 and opacity <= 1),
  coordinates jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restaurants enable row level security;
alter table public.menu_photos enable row level security;
alter table public.menu_items enable row level security;
alter table public.visits enable row level security;
alter table public.visit_menu_items enable row level security;
alter table public.menu_annotations enable row level security;

create policy "Users manage own restaurants"
  on public.restaurants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own menu photos"
  on public.menu_photos for all
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_photos.restaurant_id
      and restaurants.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_photos.restaurant_id
      and restaurants.user_id = auth.uid()
    )
  );

create policy "Users manage own menu items"
  on public.menu_items for all
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_items.restaurant_id
      and restaurants.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_items.restaurant_id
      and restaurants.user_id = auth.uid()
    )
  );

create policy "Users manage own visits"
  on public.visits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own visit menu items"
  on public.visit_menu_items for all
  using (
    exists (
      select 1 from public.visits
      where visits.id = visit_menu_items.visit_id
      and visits.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.visits
      where visits.id = visit_menu_items.visit_id
      and visits.user_id = auth.uid()
    )
  );

create policy "Users manage own menu annotations"
  on public.menu_annotations for all
  using (
    exists (
      select 1
      from public.menu_photos
      join public.restaurants on restaurants.id = menu_photos.restaurant_id
      where menu_photos.id = menu_annotations.menu_photo_id
      and restaurants.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_photos
      join public.restaurants on restaurants.id = menu_photos.restaurant_id
      where menu_photos.id = menu_annotations.menu_photo_id
      and restaurants.user_id = auth.uid()
    )
  );

create index restaurants_user_id_name_idx on public.restaurants (user_id, name);
create index menu_photos_restaurant_id_idx on public.menu_photos (restaurant_id);
create index menu_items_restaurant_id_idx on public.menu_items (restaurant_id);
create index visits_restaurant_id_visited_at_idx on public.visits (restaurant_id, visited_at desc);
create index visit_menu_items_visit_id_idx on public.visit_menu_items (visit_id);
create index menu_annotations_menu_photo_id_idx on public.menu_annotations (menu_photo_id);

insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', false)
on conflict (id) do nothing;

create policy "Users manage own menu photo files"
  on storage.objects for all
  using (
    bucket_id = 'menu-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'menu-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
