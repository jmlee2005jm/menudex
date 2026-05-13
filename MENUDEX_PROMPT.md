# MenuDex Project Prompt

Read this before working on MenuDex.

## Product

MenuDex is a Korean-first personal restaurant/menu logging web app by JM Lee.
It helps users remember which menu items they have tried at each restaurant,
mainly through menu photos and reversible highlight overlays.

The main flow is:

```text
프로필 선택 -> 식당 목록 -> 식당 상세 -> 메뉴 사진/방문 기록 -> 방문 기록 추가 -> 메뉴 하이라이트
```

## Current Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Supabase Free for Postgres and Storage
- Kakao Maps JavaScript SDK for the first map view
- Vercel target hosting
- Single shared app with multiple local profiles, not Supabase Auth users

## Hard Constraints

- Default visible language is Korean.
- UI should feel personal and app-like, not corporate/company-style.
- Do not add a marketing landing page.
- The first screen is profile selection.
- Use mobile-first layouts and verify PC/mobile suitability after UI changes.
- Always verify the web app after changes with typecheck, lint, build, and smoke test when feasible.
- Keep code and README cleaned up regularly.
- Preserve original menu photos; never burn highlights into image files.
- Highlights are separate overlay data and must be reversible.
- Profile icons and restaurant icons are optional.
- Use `defaulticon.png` fallback for profiles without icons.
- Menu photos are owned by the uploading profile; only that profile may delete them.
- Visits/reviews/highlights are profile-scoped.
- Restaurants and restaurant metadata are shared across profiles.
- Do not implement challenge failure/reset logic.
- Do not force full manual menu entry as the main workflow.
- Avoid misleading completion stats when a total is unknown.

## Current UX Decisions

- Show selected profile in the header on every view except profile selection.
- Restaurant cards use `n회 방문`, not `방문 n회`.
- Restaurant list defaults to latest visit sorting. When the user selects name
  sorting, automatically switch to ascending ㄱ-ㅎ order.
- `/restaurants` shows a compact recent visits panel with menu names; on mobile
  it appears before the restaurant list, and on desktop it behaves like a side panel.
- The `/restaurants` recent visits panel shows at most 4 items and links to
  `/visits` with `더 보기`.
- Recent visits have `내 최근` and `전체 최근` tabs and show which profile visited.
- Recent visit ordering uses visit date with creation time as the tie-breaker so
  same-day logs reflect actual recent entry order.
- Restaurant cards show `해금된 메뉴 x/y`.
- If total menu count is unknown, show `해금된 메뉴 x/?`.
- `목표 메뉴 수` is manually entered per restaurant.
- `해금된 메뉴` numerator is the selected profile's unique tried menu names at that restaurant.
- Restaurant detail treats `방문 기록 추가` as the primary action.
- Date inputs should default to the current date.
- Visit logging includes meal type with time-based default.
- Ratings are mandatory for visit menu entries and use half-star units.
- Visit photos are optional food/visit photos, separate from menu photos.
- Visit photo display should stay small and not interfere with current visit entry size.
- Visit edit should keep photo controls compact: show current thumbnail, optional
  replacement upload, and small delete control inside the existing save flow.
- Star display should use yellow colored stars, not raw `3/5` text.
- Placeholder text should be generic, not specific real restaurant examples.
- Address field and external map link field are intentionally omitted from the UI.
- Built-in Kakao Maps location is preferred over per-restaurant external map links.
- Kakao Maps should appear directly in the product flow: `/restaurants` shows
  all coordinate-enabled restaurants, each restaurant detail shows that
  restaurant's location, and `/map` remains a larger all-restaurant map view.
- Kakao Maps uses optional restaurant latitude/longitude fields internally and
  should degrade cleanly if the Kakao key or coordinates are missing.
- Users should set restaurant location through Kakao place search first, with
  map-click pinning as the fallback. Do not make manual lat/lng entry the main UI.
- Menu photo adding and manual menu adding live under one `메뉴 추가` screen.
- Menu photo label is intentionally omitted.
- Manual menu category is intentionally omitted.

## Performance Notes

- A shared app session provider prevents duplicate `/api/session` requests.
- Short-lived `sessionStorage` caches are used for profile, restaurant list, and restaurant detail GETs.
- Clear related cached entries after creates/updates/deletes.
- The restaurant list API should stay lightweight and avoid full nested detail payloads.

## Future Ideas

- See `docs/gamification.md` for broader game-mode brainstorming.
- Restaurant category filters.
- Freehand/polygon/brush highlighting for non-rectangular menu layouts.
- Link highlights to visit menu entries.
- Profile/player color assignment.
- Map coloring by profile visit ownership/intensity.
- Repeated visits to the same restaurant should increase that profile color intensity.
- Map view modes may later include selected profile, all profiles, or dominant visitor.
- Kakao map clustering/filtering for many restaurant markers.
