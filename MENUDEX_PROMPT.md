# MenuDex Project Prompt

Read first before MenuDex work.

## Product

MenuDex = Korean-first personal restaurant/menu log by JM Lee.

Purpose: remember restaurants, menu photos, tried menus, ratings, highlights.

Not challenge judge. No failure/reset logic.

Main flow:

```text
프로필 선택 -> 식당 목록 -> 식당 상세 -> 메뉴 사진/방문 기록 -> 방문 기록 추가 -> 하이라이트
```

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Supabase Free: Postgres + Storage
- Kakao Maps JavaScript SDK
- Vercel target
- Shared app, multiple local profiles. No Supabase Auth users now.

## Hard Rules

- Visible app language = Korean.
- Tone/UI = personal app, not company dashboard.
- No marketing landing page.
- First screen = profile select.
- `/` -> `/restaurants` if valid profile session, else `/profiles`.
- Mobile-first. Check mobile + PC after UI change.
- After UI/API change: typecheck, lint, build, restart dev server, smoke when feasible.
- Keep docs short: only important rules, architecture, features, major cleanup.
- First MenuDex chat each day: maintenance check alongside work.
- Original menu photos never modified destructively.
- Highlights = reversible overlay data.
- Profile icons and restaurant icons optional.
- Profiles without icon use `defaulticon.png`.
- Restaurants without icon: text-only, no weak placeholder box.
- Create/update submit locks after first press.
- Menu photos owned by uploader profile; only owner can delete.
- Visits/reviews/highlights profile-scoped.
- Restaurants shared across profiles.
- Full manual menu entry optional.
- No fake completion stats when total unknown.

## UX Rules

- Show selected profile in header except profile select.
- Restaurant list default sort = latest visit.
- Name sort starts ㄱ-ㅎ.
- Recent ordering = date, then meal order (`저녁 > 점심 > 아침 > 기타`), then created time.
- Restaurant filters collapsed by default. Broad `전체` defaults.
- `/restaurants` recent panel: `내 최근` / `전체 최근`, max 4, profile name, `더 보기`.
- Cards show `n회 방문`, latest visit, `해금된 메뉴 x/y`; unknown total = `x/?`.
- Restaurant detail: `방문 기록 추가` primary.
- Mobile detail: `메뉴 추가` + `식당 수정` same row.
- `식당 삭제` small danger action near name.
- Date inputs default current date.
- Visit log supports meal type, multiple menus, optional per-menu food photos, optional rating/review.
- Missing rating = visible `평가 대기`; can rate from `/visits`.
- Food photos separate from menu photos. Attach to menu row, not whole visit.
- Visit photos compact; click opens dark lightbox.
- Menu photo upload: multi-select, HEIC/HEIF convert, four-corner crop, removable thumbnails, one submit.
- Upload/paste boxes: only black `파일 선택` opens picker. Dotted area focuses paste.
- Stars = yellow icons, not `3/5`.
- Placeholder text generic, no real restaurant examples.
- Address + external map link omitted.
- Kakao Maps in `/restaurants`, detail, `/map`.
- `/map`: large map, 50m default scale.
- `/restaurants` map: current-location-ish, 200m scale.
- Location select: Kakao place search first, pin fallback. Hide raw lat/lng.
- `메뉴 추가` combines menu photos + optional manual menu.
- Visit creation shows existing menu photos as reference.
- Menu photo label omitted.
- Manual menu category omitted.
- Restaurant edit can delete current icon.

## Perf Rules

- Shared app session provider prevents duplicate `/api/session`.
- `sessionStorage` cache for profile, restaurant list, restaurant detail.
- Clear related caches after writes.
- Restaurant list API stays lightweight. No full nested detail payload.

## Future

- See `docs/gamification.md`.
- Bulk import needs stronger filtering/sorting first.
- Freehand/polygon/brush highlight.
- Link highlights to visit rows.
- Profile colors, badges/titles, map territory.
- Kakao clustering/filtering.
- Nearby unsaved restaurants via Kakao Local after UX decision.
