# MenuDex Maintenance Log

This file records cleanup and bug-detection passes so future work can preserve
the same constraints and avoid rediscovering known issues.

## 2026-05-18 Cleanup Pass

- Performed the first-after-6-PM maintenance check at 20:01 KST: read
  `MENUDEX_PROMPT.md`, reviewed this maintenance log, and checked the worktree
  before implementing the requested change.
- Ran whitespace check with `git diff --check`.
- Ran `npm run typecheck`.
- Ran `npm run lint`.
- Reviewed recent visit-photo, crop, lightbox, and map changes.
- Split canvas crop and scan-style perspective correction logic out of
  `src/components/paste-image-input.tsx` into `src/lib/image-crop.ts`.
- Replaced visit-photo thumbnails nested inside restaurant links with real
  buttons so opening the lightbox does not conflict with navigation.
- Added object URL cleanup for `PasteImageInput` crop sources and preview URLs.
- Hardened visit creation cleanup: if menu item insertion or per-menu photo
  upload fails, the partially created visit and uploaded files are cleaned up.
- Confirmed the accidental `기타` visit was one visit containing three menu rows,
  and updated that visit to `저녁`.
- Adjusted the large map interaction so compact restaurant rows focus the marker
  and use a separate detail link for navigation.
- Set the large `/map` view to a close default zoom level.
- Removed weak restaurant icon placeholder boxes; restaurants without icons now
  render as text-only rows.
- Standardized restaurant-detail visit rows so photo/no-photo entries keep a
  consistent photo slot; owned no-photo rows use a dotted add-photo affordance.
- Fixed the shared `Field` wrapper so complex inputs are no longer wrapped in a
  label that makes the whole dotted image-paste area trigger file selection.
- Documented the `/restaurants` recent-visit panel behavior: max 4 entries,
  viewport-constrained height, internal scrolling.
- Added the first restaurant filtering layer: cuisine, food type, visit status,
  and location status on `/restaurants`; search/category/location filtering on
  `/map`.
- Extended menu photo upload so multiple cropped photos can be saved in one
  submit, with API cleanup if any storage or database step fails.
- Updated multi-photo menu upload so canceling a crop skips only the current
  photo and cropped photos remain individually removable before final submit.
- Applied UX pass from Korean user notes: collapsed restaurant filters, closer
  restaurant-detail map zoom, clearer highlight save/cancel controls, larger
  mobile crop handles, and current-location default for new location picker.
- Fixed desktop HEIC menu-photo flow by converting HEIC/HEIF before opening the
  crop UI, and adjusted restaurant filter button weight for mobile/desktop.
- Updated root routing so `/` sends existing profile sessions to `/restaurants`
  and new/no-session users to `/profiles`.

## Regular Checklist

- Read `MENUDEX_PROMPT.md` before making changes.
- On the first MenuDex chat after 6 PM local time each day, run a maintenance
  check before or alongside the requested work.
- Keep `README.md` and this file current when product behavior or architecture
  changes.
- Prefer splitting large UI files when utility logic grows beyond the component.
- After UI or API changes, run:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - restart dev server after build if it was running
  - `npm run smoke:web`
