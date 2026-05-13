# MenuDex

MenuDex is a personal restaurant/menu memory app by **JM Lee**.

The core workflow is simple: save a restaurant, add menu photos, log what was tried, and later mark tried items on menu photos with editable highlight overlays. MenuDex is a private log and memory aid, not a challenge judge.

## Current Status

The app uses Supabase as the source of truth, but no longer uses Supabase Auth
for local app login. MenuDex now starts with Switch-style profile selection for
a small trusted friend group.

Implemented:

- Korean-first UI.
- `/` redirects to `/profiles`.
- Switch-style profile selection with a signed HttpOnly session cookie.
- Supabase-backed restaurant list and restaurant creation.
- Supabase-backed manual menu item creation.
- Supabase Storage upload for menu photos.
- HEIC/HEIF menu photos are converted to JPEG in the browser before upload.
- Menu photos display at screen width without horizontal overflow.
- Rectangular semi-transparent highlights can be drawn, confirmed, canceled, and deleted later.
- Menu photo upload and optional manual menu entry share one `메뉴 추가` screen.
- Supabase-backed visit logging with meal type, tried menu, half-star rating, and optional short review.
- Optional visit photos are stored separately from menu photos and displayed as
  small thumbnails on visit entries.
- Visit edit supports compact photo replace/delete controls inside the existing
  review edit form.
- Delete controls for accidental restaurant, menu photo, manual menu, and visit entries.
- Inline edit controls for saved visit reviews.
- Restaurant creation/edit supports optional multi-select cuisine categories, food
  types, and manual icon upload.
- Menu photo and restaurant icon inputs support file selection and clipboard
  image paste.
- Restaurant edit shows the current icon preview when one exists.
- Restaurant creation/edit supports Kakao place search and map-click pinning for
  location selection.
- `/restaurants` shows all coordinate-enabled restaurants on a compact Kakao map.
- Restaurant detail shows that restaurant's location on Kakao Maps when coordinates exist.
- `/map` provides a larger all-restaurant map view.
- Restaurant creation/edit supports optional latitude and longitude fields.
- Restaurants are shared across profiles.
- Visits/reviews and highlights are profile-scoped.
- Menu photos are owned by the profile that uploaded them; only that profile can delete them.
- Restaurant list can sort by name, latest visit, or visit count, with a compact
  arrow button for direction.
- `/restaurants` shows a compact recent visits panel with up to 4 visits and a
  `더 보기` link to `/visits`.
- Recent visits support `내 최근` and `전체 최근` tabs and show the visiting profile.
- Session/profile state is fetched once through a shared app provider, so the
  header and page content do not duplicate session requests.
- Short-lived sessionStorage caches are used for profile, restaurant list, and
  restaurant detail GETs, with related cache entries cleared after writes.
- The restaurant list API returns lightweight visit summary fields instead of
  full nested visit payloads.
- Server-side Supabase service-role API routes with owner checks.
- Graceful Korean setup state when required env vars are missing.

Not implemented yet:

- Linking annotations to visits/menu items.
- Full auth route protection middleware.
- OCR.
- Kakao map clustering or advanced filtering.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vercel free tier for hosting
- Supabase Free for Postgres and Storage
- Shared restaurant data with profile-scoped visits/highlights
- Zod later for validation at the data boundary

## Supabase Setup

Create a Supabase project, then set:

```bash
cp .env.example .env.local
```

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MENUDEX_OWNER_ID=
MENUDEX_SESSION_SECRET=
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=
```

Generate `MENUDEX_OWNER_ID` as any UUID. On macOS:

```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

Use a long random string for `MENUDEX_SESSION_SECRET`.

Apply the schemas in order:

```text
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_single_user_owner.sql
supabase/migrations/0003_restaurant_categories_icons.sql
supabase/migrations/0004_profiles.sql
supabase/migrations/0005_restaurant_menu_goal.sql
supabase/migrations/0006_visit_photos.sql
supabase/migrations/0007_restaurant_coordinates.sql
```

The first migration creates:

- app enums
- app tables
- RLS policies
- private `menu-photos` Storage bucket
- Storage object policy scoped by user ID folder

The second migration removes direct `auth.users` foreign keys from owner columns.
That lets the app use a synthetic `MENUDEX_OWNER_ID` without creating a Supabase
Auth user. RLS policies remain in place for the future, but the current Next.js
API routes use the service-role key and enforce owner checks in server code.

The fourth migration creates profiles, seeds the first profile as `JM`, and assigns
existing visits/photos/highlights to that profile.

The seventh migration adds optional latitude/longitude fields for Kakao Maps.
Restaurants without coordinates still work normally; they are simply omitted from
the `/map` marker view.

Menu photos are uploaded to paths like:

```text
{userId}/{restaurantId}/{uuid}.{extension}
```

For the current single-user version, the path starts with `MENUDEX_OWNER_ID`.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. It is only used in
server route handlers.

## Kakao Maps Setup

`/map` uses the Kakao Maps JavaScript SDK. Set `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`
to the Kakao JavaScript key, not the REST API key.

In Kakao Developers, register the local and deployed domains that will load the
map, for example:

```text
http://localhost:3000
https://your-vercel-domain.vercel.app
```

Kakao Maps also needs the Maps/Local service enabled for the app. If Kakao
returns `disabled OPEN_MAP_AND_LOCAL service`, enable the 지도/로컬 product for
the app in Kakao Developers. After changing the key, service, or allowed domains,
restart the Next.js dev server.

## Product Rules

- Menu photos are central.
- Original menu photos must not be edited destructively.
- Highlights should be stored separately as normalized overlay coordinates.
- Highlight coordinates are normalized to image size so they stay aligned across mobile and desktop.
- Rectangular highlights are only the first pass. Later highlighting should support less perfectly aligned menu photos, likely through freehand/brush strokes or polygon highlights.
- Full typed menu entry is optional.
- Repeated menus are allowed; this app records behavior, it does not enforce challenge rules.
- Branches can be separate restaurants.
- Restaurant address and external map links are intentionally omitted from the UI.
- Kakao Maps location selection uses place search first, with map-click pinning
  as the fallback.
- Restaurant cards show visit count and latest visit instead of menu coverage.
- Restaurant cards show `해금된 메뉴 x/y`, where `x` is the selected profile's
  unique tried menu names and `y` is the restaurant's optional `목표 메뉴 수`.
- If `목표 메뉴 수` is not entered yet, the card shows `해금된 메뉴 x/?`.
- Restaurant name and branch/place are displayed as separate text treatments.
- Restaurant categories are split into broad cuisine and food/service type.
- Restaurant icons are manually uploaded by the user; no logo scraping is used.
- The first screen is profile selection. Add friends through `프로필 추가`.
- The selected profile is shown in the header on every view except profile selection.
- Profiles can be edited or deleted from the profile selection screen.
- Profile and restaurant icons open a square crop editor before upload.
- Restaurant detail defaults to `내 기록`; `전체 기록` includes friends' visits.
- Menu photo labels are intentionally omitted for now.
- Menu item categories are intentionally omitted for now.
- Accidental entries should be removable from the restaurant detail page.
- Saved visit reviews should be editable without leaving the restaurant detail page.
- The restaurant detail page treats `방문 기록 추가` as the primary action.
- Restaurant cards use `n회 방문` wording and Korean-aware name sorting.
- Visit logs include meal type: `breakfast`, `lunch`, `dinner`, or `other`.
- Ratings support half-star values from `0.5` to `5`.
- The visible app does not use menu coverage anymore; restaurant cards prioritize
  visit count, unlocked menu progress, and latest visit instead.

## UI Direction

MenuDex should feel like a personal menu notebook, not a company dashboard.

- Korean-first UI.
- Mobile-first interactions.
- Quiet, fast, and practical.
- No landing-page feel unless the page is a login page.
- Avoid heavy KPI cards, sales copy, corporate dashboards, and decorative gradients.
- Prefer direct list/detail flows, large touch targets, restrained borders, and real user content.

## Data Model

The schema draft lives in `supabase/migrations/0001_initial_schema.sql`.

Core tables:

- `restaurants`: shared restaurant records with name, optional branch, notes,
  categories, icon, optional total menu goal, and optional map coordinates.
- `menu_photos`: original menu photo metadata with private Storage path.
- `menu_annotations`: editable highlight overlays for menu photos.
- `menu_items`: optional structured menu records with name, optional price, and active/inactive state.
- `visits`: restaurant visits with date and meal type.
- `visit_photos`: optional food/visit photos attached to a visit.
- `visit_menu_items`: menus tried during visits, with optional structured menu item link, manual name, rating, and review.

Ownership:

- `restaurants.user_id` keeps shared restaurant records under `MENUDEX_OWNER_ID`.
- `visits.profile_id` scopes visits and reviews to the selected profile.
- `menu_annotations.profile_id` scopes highlights to the selected profile.
- `menu_photos.owner_profile_id` records which profile uploaded a menu photo.
- Deleting a profile removes that profile's visits, highlights, icon, and uploaded menu photos.

## App Structure

```text
src/
  app/
    page.tsx
    profiles/page.tsx
    login/page.tsx
    api/
      session/route.ts
      restaurants/
      visits/route.ts
    map/page.tsx
    restaurants/
      page.tsx
      new/page.tsx
      [restaurantId]/
        edit/
        page.tsx
        restaurant-detail.tsx
        menus/new/
        visits/new/
  components/
    app-state.tsx
    form-fields.tsx
    kakao-map.tsx
    menu-photo-annotator.tsx
    page-shell.tsx
    rating-field.tsx
  lib/
    api.ts
    app-auth.ts
    date.ts
    domain.ts
    use-app-session.ts
    supabase/
      admin.ts
      types.ts
supabase/
  migrations/
    0001_initial_schema.sql
    0002_single_user_owner.sql
scripts/
  smoke-web.mjs
```

## Next Implementation Steps

1. Add generated Supabase database types for route handlers.
2. Add edit flows.
3. Add menu photo viewer.
4. Add Kakao map clustering/filtering when there are many restaurants.
5. Add freehand or polygon highlight support for tilted/non-rectangular menu photos.
6. Link highlights to visits or tried menu rows.
7. Replace app-password auth with real multi-user auth when needed.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Smoke-test the running web app:

```bash
npm run smoke:web
```

Run static checks:

```bash
npm run typecheck
npm run lint
npm run build
```

When running `npm run build`, stop the dev server first. Running `next build` while `next dev` is serving can leave `.next` in a stale state.
