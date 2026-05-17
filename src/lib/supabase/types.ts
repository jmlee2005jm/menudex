export type ProfileRow = {
  id: string;
  display_name: string;
  icon_storage_path: string | null;
  iconUrl?: string;
  created_at: string;
  updated_at: string;
};

export type RestaurantRow = {
  id: string;
  user_id: string;
  name: string;
  branch_name: string | null;
  map_url: string | null;
  notes: string | null;
  menu_coverage: "unknown" | "partial" | "full";
  cuisine_category: string | null;
  food_type: string | null;
  icon_storage_path: string | null;
  total_menu_goal: number | null;
  latitude: number | null;
  longitude: number | null;
  iconUrl?: string;
  created_at: string;
  updated_at: string;
};

export type MenuPhotoRow = {
  id: string;
  restaurant_id: string;
  owner_profile_id: string;
  owner_profile?: ProfileRow | null;
  storage_path: string;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
  signedUrl?: string;
  menu_annotations?: MenuAnnotationRow[];
};

export type MenuAnnotationCoordinates = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MenuAnnotationRow = {
  id: string;
  menu_photo_id: string;
  profile_id: string;
  visit_id: string | null;
  tried_menu_id: string | null;
  type: "highlight";
  shape: "rect" | "freehand";
  color: string;
  opacity: number;
  coordinates: MenuAnnotationCoordinates;
  created_at: string;
  updated_at: string;
};

export type MenuItemRow = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VisitRow = {
  id: string;
  restaurant_id: string;
  user_id: string;
  profile_id: string;
  profiles?: ProfileRow | null;
  visited_at: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "other";
  created_at: string;
  updated_at: string;
};

export type VisitMenuItemRow = {
  id: string;
  visit_id: string;
  menu_item_id: string | null;
  manual_menu_name: string | null;
  rating: number | null;
  review: string | null;
  created_at: string;
  updated_at: string;
};

export type VisitPhotoRow = {
  id: string;
  visit_id: string;
  visit_menu_item_id: string | null;
  profile_id: string;
  storage_path: string;
  signedUrl?: string;
  created_at: string;
};

export type VisitWithMenu = VisitRow & {
  visit_menu_items: VisitMenuItemRow[];
  visit_photos?: VisitPhotoRow[];
};
