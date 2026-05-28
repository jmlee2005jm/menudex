# MenuDex

Personal restaurant/menu memory app by **JM Lee**.

Goal: remember restaurants, menu photos, tried menus, ratings. App = log, not judge.

Main flow:

```text
프로필 선택 -> 식당 목록 -> 식당 상세 -> 메뉴 사진/방문 기록 -> 방문 기록 추가 -> 하이라이트
```

## Status

Built foundation:

- Korean-first responsive app.
- Switch-style profile select, signed HttpOnly session cookie.
- Supabase source of truth. No Supabase Auth for app login now.
- Shared restaurants. Profile-scoped visits/reviews/highlights.
- Menu photo ownership by uploader profile.
- Menu-photo flow: multi-upload, HEIC/HEIF convert, four-corner crop, reversible overlay highlight.
- Visit flow: multiple menu rows, meal type, optional food photos, optional half-star rating/review, `평가 대기`.
- Restaurant flow: categories, optional icon, sort/filter, recent visits, edit/delete, duplicate-submit lock.
- Kakao Maps: place search, pin fallback, restaurant list map, detail map, large `/map`.
- Client cache: session, restaurant list, restaurant detail.
- Server API: Supabase service-role routes with owner/profile checks.

Not yet:

- Link highlights to visit/menu rows.
- Full auth middleware.
- OCR.
- Map clustering.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Vercel target
- Supabase Free: Postgres + Storage
- Kakao Maps JavaScript SDK

## Env

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

`MENUDEX_OWNER_ID`: UUID.

```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

`MENUDEX_SESSION_SECRET`: long random string.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## DB Setup

Apply migrations in order:

```text
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_single_user_owner.sql
supabase/migrations/0003_restaurant_categories_icons.sql
supabase/migrations/0004_profiles.sql
supabase/migrations/0005_restaurant_menu_goal.sql
supabase/migrations/0006_visit_photos.sql
supabase/migrations/0007_restaurant_coordinates.sql
supabase/migrations/0008_visit_photos_per_menu.sql
```

Important DB shape:

- `restaurants`: shared restaurant data.
- `profiles`: local friend profiles.
- `menu_photos`: original menu photo metadata + Storage path.
- `menu_annotations`: profile-scoped highlight overlays.
- `visits`: date + meal type.
- `visit_menu_items`: tried menu rows, rating/review.
- `visit_photos`: food photos, attached to specific tried menu rows.

Storage path:

```text
{ownerId}/{restaurantId}/{uuid}.{extension}
```

## Kakao Maps

Use Kakao JavaScript key, not REST key.

Register domains:

```text
http://localhost:3000
https://your-vercel-domain.vercel.app
```

Enable Kakao 지도/로컬 product. Restart dev server after key/domain/service change.

## Product Rules

- Menu photos central.
- Never burn highlights into image files.
- Highlights = normalized overlay data.
- Typed full menu optional.
- Repeat menu allowed.
- Branches can be separate restaurants.
- Address/external map link omitted. Built-in Kakao map preferred.
- Place search first, pin fallback.
- Cards show visits/latest visit/`해금된 메뉴 x/y`; unknown total = `x/?`.
- Icons optional. No logo scraping.
- First screen = profile select.
- Restaurant detail default = `내 기록`; `전체 기록` shows friends.
- Menu photo labels omitted.
- Menu item categories omitted.
- `방문 기록 추가` = primary restaurant-detail action.
- Rating = half-star, optional at log time. Missing rating = `평가 대기`.

## App Shape

```text
src/
  app/
    profiles/
    restaurants/
    visits/
    map/
    api/
  components/
  lib/
docs/
supabase/migrations/
scripts/
```

Key docs:

- `MENUDEX_PROMPT.md`: working rules.
- `docs/maintenance.md`: important cleanup log.
- `docs/gamification.md`: game-mode ideas.

## Dev

```bash
npm install
npm run dev
npm run smoke:web
npm run typecheck
npm run lint
npm run build
```

Stop dev server before `npm run build` when possible. Stale `.next` can confuse build.
