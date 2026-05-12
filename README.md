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
- Delete controls for accidental restaurant, menu photo, manual menu, and visit entries.
- Inline edit controls for saved visit reviews.
- Restaurant creation/edit supports optional multi-select cuisine categories, food
  types, and manual icon upload.
- Menu photo and restaurant icon inputs support file selection and clipboard
  image paste.
- Restaurant edit shows the current icon preview when one exists.
- External map links open in a new tab.
- Restaurants are shared across profiles.
- Visits/reviews and highlights are profile-scoped.
- Menu photos are owned by the profile that uploaded them; only that profile can delete them.
- Restaurant list can sort by name, latest visit, or visit count, with a compact
  arrow button for direction.
- Session/profile state is fetched once through a shared app provider, so the
  header and page content do not duplicate session requests.
- The restaurant list API returns lightweight visit summary fields instead of
  full nested visit payloads.
- Server-side Supabase service-role API routes with owner checks.
- Graceful Korean setup state when required env vars are missing.

Not implemented yet:

- Linking annotations to visits/menu items.
- Full auth route protection middleware.
- OCR or map embedding.

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

Menu photos are uploaded to paths like:

```text
{userId}/{restaurantId}/{uuid}.{extension}
```

For the current single-user version, the path starts with `MENUDEX_OWNER_ID`.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. It is only used in
server route handlers.

## Product Rules

- Menu photos are central.
- Original menu photos must not be edited destructively.
- Highlights should be stored separately as normalized overlay coordinates.
- Highlight coordinates are normalized to image size so they stay aligned across mobile and desktop.
- Rectangular highlights are only the first pass. Later highlighting should support less perfectly aligned menu photos, likely through freehand/brush strokes or polygon highlights.
- Full typed menu entry is optional.
- Repeated menus are allowed; this app records behavior, it does not enforce challenge rules.
- Branches can be separate restaurants.
- Restaurant address is intentionally omitted for now; use notes or an external map link when needed.
- Restaurant cards show visit count and latest visit instead of menu coverage.
- Restaurant card `알려진 메뉴` counts menus logged inside visits across every profile.
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
- Visit logs include meal type: `breakfast`, `lunch`, `dinner`, or `other`.
- Ratings support half-star values from `0.5` to `5`.
- The visible app does not use menu coverage anymore; restaurant cards prioritize
  visit count and latest visit instead.

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

- `restaurants`: user-owned restaurant records with name, optional branch, optional map URL, notes, and menu coverage.
- `menu_photos`: original menu photo metadata with private Storage path.
- `menu_annotations`: editable highlight overlays for menu photos.
- `menu_items`: optional structured menu records with name, optional price, and active/inactive state.
- `visits`: restaurant visits with date and meal type.
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
4. Add freehand or polygon highlight support for tilted/non-rectangular menu photos.
5. Link highlights to visits or tried menu rows.
6. Add menu coverage summaries without misleading completion stats.
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
