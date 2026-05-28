type VisitWithRecency = {
  visited_at: string;
  created_at?: string | null;
  meal_type?: "breakfast" | "lunch" | "dinner" | "other" | null;
};

const mealRecencyRank = {
  other: 0,
  breakfast: 1,
  lunch: 2,
  dinner: 3,
} as const;

export function compareVisitsByRecency(left: VisitWithRecency, right: VisitWithRecency) {
  const leftDate = visitDateKey(left.visited_at);
  const rightDate = visitDateKey(right.visited_at);
  const dateComparison = rightDate.localeCompare(leftDate);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const mealComparison = mealRank(right) - mealRank(left);

  if (mealComparison !== 0) {
    return mealComparison;
  }

  return createdTime(right.created_at) - createdTime(left.created_at);
}

export function sortVisitsByRecency<T extends VisitWithRecency>(visits: T[]) {
  return [...visits].sort(compareVisitsByRecency);
}

export function visitRecencyValue(visit: VisitWithRecency) {
  const dateTime = Date.parse(`${visitDateKey(visit.visited_at)}T00:00:00.000Z`);

  return dateTime + mealRank(visit) * 60 * 60 * 1000 + createdTime(visit.created_at) / 10 ** 15;
}

function visitDateKey(value: string) {
  return value.slice(0, 10);
}

function mealRank(visit: VisitWithRecency) {
  return mealRecencyRank[visit.meal_type ?? "other"];
}

function createdTime(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}
