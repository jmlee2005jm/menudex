alter table public.restaurants
  add column if not exists cuisine_category text,
  add column if not exists food_type text,
  add column if not exists icon_storage_path text;
