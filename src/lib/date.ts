export type MealType = "breakfast" | "lunch" | "dinner" | "other";

export function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultMealType(): MealType {
  const date = new Date();
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes >= 5 * 60 && minutes < 10 * 60 + 30) {
    return "breakfast";
  }

  if (minutes >= 10 * 60 + 30 && minutes < 15 * 60) {
    return "lunch";
  }

  if (minutes >= 16 * 60 + 30 && minutes < 21 * 60) {
    return "dinner";
  }

  return "other";
}
