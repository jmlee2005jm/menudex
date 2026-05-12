-- MenuDex now runs as a single-user app-password app while keeping owner columns.
-- Service-role API routes enforce owner_id in application code.
-- Later multi-user auth can restore auth.users foreign keys or add an app_users mapping.

alter table public.restaurants
  drop constraint if exists restaurants_user_id_fkey;

alter table public.visits
  drop constraint if exists visits_user_id_fkey;
