# MenuDex Gamification Brainstorm

This document collects possible game mechanics for MenuDex. These are not
commitments yet. The goal is to make logging feel more playful without making
food tracking stressful or blocking normal record keeping.

## Core Principle

MenuDex should keep factual logging separate from game scoring.

- `방문 기록`: factual history, always allowed.
- `게임 인정 기록`: visits that count toward progress, badges, territory, streaks,
  and mastery.

This separation lets the app preserve real history while still supporting rules
for a game-like mode.

## Daily Validity Rules

Possible rule set per profile/player:

- 1 valid breakfast restaurant per day.
- 1 valid lunch restaurant per day.
- 1 valid dinner restaurant per day.
- 1 bonus valid restaurant per day, usable anytime.

Open decisions:

- Should `기타` automatically use the bonus slot?
- Can the bonus slot be used even if breakfast/lunch/dinner are unused?
- Can one restaurant consume multiple slots in one day?
- Can multiple menu items from the same visit all count as unlocked?
- Should game-valid visits be editable after the day ends?

Recommended implementation later:

```ts
Visit {
  countsForGame: boolean
  gameSlot?: "breakfast" | "lunch" | "dinner" | "bonus"
}
```

When a slot is already used, the app can offer:

- `보너스로 기록`
- `기록만 저장`
- `기존 게임 기록 바꾸기`

## Player Identity

Each profile can become a player.

Possible profile fields:

```ts
Profile {
  displayName: string
  iconStoragePath?: string
  color: string
  selectedTitleId?: string
}
```

Profile color should be used consistently:

- visit entries
- badges
- map markers
- restaurant ownership/territory
- profile summaries

## Map Territory

Map coloring idea:

- Each restaurant marker is colored by profile/player.
- Repeated valid visits make the color stronger.
- A restaurant can have multiple colors if multiple players have visited.

Display modes:

- `내 영역`: only selected profile's color and intensity.
- `전체 영역`: all players shown together.
- `최다 방문자`: marker uses the color of the player with most valid visits.
- `최근 방문자`: marker uses the most recent valid visitor.
- `혼합`: marker blends colors from all valid visitors.

Intensity examples:

```text
1 valid visit  = 25% opacity
2 valid visits = 40% opacity
3 valid visits = 55% opacity
5 valid visits = 70% opacity
10+ visits     = 90% opacity
```

Avoid making color too decorative; it should help quickly understand ownership
and history.

## Menu Unlock Progress

Current direction:

```text
해금된 메뉴 7/39
해금된 메뉴 7/?   // total unknown
```

Definitions:

- Numerator: selected profile's unique tried menu names at that restaurant.
- Denominator: manually entered `목표 메뉴 수`.
- Unknown total uses `?`, not a fake completion percent.

Questions:

- Should repeated same-name menus count once? Recommended: yes.
- Should seasonal/event menus count? Recommended: only if manually included in
  the goal.
- Should hidden menus count? Recommended: only after discovery and manual goal
  adjustment.
- Should game mode unlocks count only valid game visits? Recommended: yes if
  game mode is enabled.

Possible additions:

- progress bar on restaurant card
- `완전 해금` badge
- `첫 해금` badge for first player to unlock a menu at a restaurant
- compare player unlock progress on restaurant detail

## Discovery Bonuses

Discovery mechanics should reward exploration without encouraging messy data.

Possible badges:

- `발견자`: first player to create or first game-valid visit a restaurant.
- `첫 방문자`: first player with a game-valid visit.
- `첫 해금`: first player to unlock any menu at that restaurant.
- `사진 제공자`: uploaded the first menu photo.
- `메뉴 개척자`: first player to reach 50% unlock progress.
- `완전 해금자`: first player to reach 100% when total is known.

Open decision:

- Should `발견자` mean "created the restaurant entry" or "first valid visit"?

Recommendation:

- Use `등록자` for the creator.
- Use `첫 방문자` for first game-valid visit.
- Use `발견자` only if the app later has map/nearby exploration mechanics.

## Mastery Levels

Restaurant/profile pair can have a computed mastery level.

Possible levels:

```text
Lv.0 미방문
Lv.1 첫 방문
Lv.2 재방문
Lv.3 단골
Lv.4 메뉴 탐험가
Lv.5 완전 해금
```

Example rules:

- `미방문`: 0 valid visits.
- `첫 방문`: 1 valid visit.
- `재방문`: 2 valid visits.
- `단골`: 5 valid visits.
- `메뉴 탐험가`: 50%+ unlock progress when total is known.
- `완전 해금`: 100% unlock progress when total is known.

Alternative names:

- `입문`
- `단골`
- `정복 중`
- `메뉴 마스터`
- `완전 해금`

Implementation recommendation:

- Start as computed labels, not stored DB rows.
- Store only after rules stabilize.

## Badges And Titles

Badges are earned achievements. Titles are user-selected labels shown on the
profile.

Badge examples:

- `첫 방문`
- `첫 해금`
- `사진 제공자`
- `단골`
- `완전 해금`
- `한식 탐험가`
- `중식 탐험가`
- `일식 탐험가`
- `카페 순례자`
- `새로운 동네`
- `7일 기록`
- `30일 기록`

Title examples:

- `메뉴 개척자`
- `단골 손님`
- `사진 기록자`
- `완전 해금러`
- `첫 방문 전문가`
- `지도 칠하는 사람`
- `숨은 메뉴 탐색자`

Recommended data model later:

```ts
Badge {
  id: string
  code: string
  name: string
  description: string
}

ProfileBadge {
  id: string
  profileId: string
  badgeCode: string
  restaurantId?: string
  earnedAt: Date
}
```

Titles can either be separate records or derived from badges.

## Streaks

Streak ideas:

- daily valid visit streak
- weekly restaurant exploration streak
- no-repeat cuisine streak
- photo upload streak

Be careful: strict streaks can make the app feel stressful. If added, use gentle
phrasing and avoid punishment.

Possible phrasing:

```text
이번 주 3회 기록
최근 7일 중 4일 방문
```

instead of:

```text
스트릭 실패
```

## Quests

Lightweight optional quests could guide exploration.

Examples:

- `이번 주 새로운 식당 1곳 방문`
- `한식 메뉴 3개 해금`
- `사진 없는 식당에 메뉴 사진 추가`
- `목표 메뉴 수 없는 식당 1곳 정리`
- `친구가 간 식당 방문`

Quest rules should be optional and never block normal logging.

## Friend Interaction

Possible friend-focused mechanics:

- restaurant detail shows each profile's unlock count
- first visitor / most visits / highest rating summary
- compare unlock progress per restaurant
- friend visit history tab
- shared map colored by profile

Avoid public social features for now. This is for a trusted friend group.

## Visual Ideas

Keep visuals restrained and useful.

Possible UI treatments:

- small colored profile chips
- thin progress bars
- marker opacity for repeated visits
- badge chips on restaurant detail
- profile color rings around restaurant icons
- compact mastery label near restaurant title

Avoid:

- noisy animations
- loot-box style rewards
- large dashboard cards
- punishment states

## Data Model Candidates

Possible future columns/tables:

```ts
profiles.color
profiles.selected_title_code

visits.counts_for_game
visits.game_slot

restaurants.created_by_profile_id

profile_badges
restaurant_profile_stats
```

`restaurant_profile_stats` could be computed from visits at first. Add a stored
table only if performance or historical snapshots require it.

## Recommended Implementation Order

1. Add profile color.
2. Display profile color on visit records and restaurant cards.
3. Compute restaurant mastery labels from existing visits and unlock progress.
4. Add optional `counts_for_game` and `game_slot` to visits.
5. Add daily slot validation UI.
6. Add simple badges for first visit, first photo, and complete unlock.
7. Add selectable profile title.
8. Add map view and color intensity.

## Open Questions

- Should unlock progress use all factual visits or only game-valid visits?
- Should game validity be opt-in per profile or global?
- Should old existing visits count for game mode retroactively?
- Should a restaurant creator get a badge?
- Should hidden/event menus be included in total menu count by default?
- Should a profile be allowed to claim more than one restaurant per meal if
  traveling or sharing food?
