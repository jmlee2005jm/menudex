alter table public.restaurants
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.restaurants
  drop constraint if exists restaurants_latitude_range;

alter table public.restaurants
  add constraint restaurants_latitude_range
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.restaurants
  drop constraint if exists restaurants_longitude_range;

alter table public.restaurants
  add constraint restaurants_longitude_range
  check (longitude is null or (longitude >= -180 and longitude <= 180));
