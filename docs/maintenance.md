# MenuDex Maintenance Log

Only important cleanup + bug-detection results. No small changelog noise.

## 2026-05-28

- Fixed `서브웨이 KAIST` visit on `2026-05-26`: dinner -> lunch.
- Fixed recent visit ordering: date -> meal order -> created time.
- Removed `/restaurants` map-location filter.
- Trimmed all markdown docs to caveman style, important points only.

## 2026-05-26

- Changed visit logging to two-step flow: rating optional first, `평가 대기` later.
- Maintenance cadence changed: first MenuDex chat of each day.

## 2026-05-18

- Split image crop logic into `src/lib/image-crop.ts`.
- Hardened cleanup for partial visit/menu-photo upload failures.
- Added multi-photo menu upload with removable cropped photos.
- Added restaurant filtering, compact map behavior, profile-aware visit photos.
- Fixed paste/upload boxes: only `파일 선택` opens picker.

## Regular Checklist

- Read `MENUDEX_PROMPT.md`.
- First MenuDex chat each day: quick maintenance check.
- Keep all markdown docs short.
- Update docs only for important product/architecture/cleanup changes.
- After UI/API change:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
  - restart dev server
  - `npm run smoke:web`
