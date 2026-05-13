alter table public.restaurants
  add column if not exists total_menu_goal integer;

alter table public.restaurants
  drop constraint if exists restaurants_total_menu_goal_nonnegative;

alter table public.restaurants
  add constraint restaurants_total_menu_goal_nonnegative
  check (total_menu_goal is null or total_menu_goal >= 0);
