alter table public.visit_photos
  add column if not exists visit_menu_item_id uuid references public.visit_menu_items(id) on delete cascade;

create index if not exists visit_photos_visit_menu_item_id_idx
  on public.visit_photos (visit_menu_item_id);
