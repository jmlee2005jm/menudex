# MenuDex Gamification

Game mode optional. Factual log always stays allowed.

## Core Split

- `방문 기록`: real history, always saved.
- `게임 인정 기록`: optional scoring layer.

## Daily Valid Slots

Possible per profile:

- 1 breakfast
- 1 lunch
- 1 dinner
- 1 bonus anytime

Open:

- Does `기타` use bonus?
- Can same restaurant use multiple slots same day?
- Do all menu rows in one valid visit count as unlocks?

Possible future fields:

```ts
Visit {
  countsForGame: boolean
  gameSlot?: "breakfast" | "lunch" | "dinner" | "bonus"
}
```

## Player

Profile may become player:

- name
- icon
- color
- selected title

Color can drive map markers, territory, badges.

## Map Territory

- Restaurant marker colored by profile activity.
- More valid visits -> stronger color.
- Modes: `내 영역`, `전체 영역`, `최다 방문자`, `최근 방문자`.
- Need clustering/filtering when restaurant count grows.

## Progress

```text
해금된 메뉴 7/39
해금된 메뉴 7/?
```

- Numerator: unique tried menu names.
- Denominator: manual goal.
- Unknown total: `?`, no fake percent.

## Rewards

Possible:

- first visit
- first menu unlock
- first menu photo
- cuisine/location badges
- mastery levels
- selected profile title

Keep rewards gentle. No punishment for missed days.
