export type MenuCoverage = "unknown" | "partial" | "full";
export type AnnotationType = "highlight";
export type AnnotationShape = "rect" | "freehand";

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Restaurant = {
  id: string;
  userId: string;
  name: string;
  branchName?: string | null;
  mapUrl?: string | null;
  notes?: string | null;
  menuCoverage: MenuCoverage;
  createdAt: string;
  updatedAt: string;
};

export type MenuPhoto = {
  id: string;
  restaurantId: string;
  imageUrl: string;
  takenAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MenuAnnotation = {
  id: string;
  menuPhotoId: string;
  visitId?: string | null;
  triedMenuId?: string | null;
  type: AnnotationType;
  shape: AnnotationShape;
  color: string;
  opacity: number;
  coordinates: NormalizedRect;
  createdAt: string;
  updatedAt: string;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  price?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Visit = {
  id: string;
  restaurantId: string;
  userId: string;
  visitedAt: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "other";
  createdAt: string;
  updatedAt: string;
};

export type VisitMenuItem = {
  id: string;
  visitId: string;
  menuItemId?: string | null;
  manualMenuName?: string | null;
  rating?: number | null;
  review?: string | null;
  createdAt: string;
  updatedAt: string;
};
