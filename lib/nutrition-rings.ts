// Nutrition rings (Activity-style): calories, protein, carbs and fat, each
// filling to 100% of its daily value per serving. Over 100% stays a full ring
// and is flagged; a missing value is an empty ring.

import { dailyValues, type Nutrients } from "./nutrition.ts";

export type RingKey = "calories" | "protein" | "carbs" | "fat";

export type Ring = {
  key: RingKey;
  label: string;
  value: number | null;
  unit: "kcal" | "g";
  dailyValue: number;
  fraction: number; // 0–1, what the ring draws
  over: boolean; // above the daily value
  partial: boolean; // some ingredients have no data for it
};

// Outer to inner. Calories uses the 2,000-calorie diet the panel cites.
const RINGS: { key: RingKey; nutrient: keyof Nutrients; label: string; unit: "kcal" | "g"; dailyValue: number }[] = [
  { key: "calories", nutrient: "kcal", label: "Calories", unit: "kcal", dailyValue: 2000 },
  { key: "protein", nutrient: "protein", label: "Protein", unit: "g", dailyValue: dailyValues.protein! },
  { key: "carbs", nutrient: "carbs", label: "Carbs", unit: "g", dailyValue: dailyValues.carbs! },
  { key: "fat", nutrient: "fat", label: "Fat", unit: "g", dailyValue: dailyValues.fat! },
];

export function nutritionRings(
  perServing: Nutrients,
  counted: Record<keyof Nutrients, number>,
  items: number,
): Ring[] {
  return RINGS.map(({ key, nutrient, label, unit, dailyValue }) => {
    const value = perServing[nutrient];
    return {
      key,
      label,
      value,
      unit,
      dailyValue,
      fraction: value === null ? 0 : Math.min(1, Math.max(0, value / dailyValue)),
      over: value !== null && value > dailyValue,
      partial: counted[nutrient] > 0 && counted[nutrient] < items,
    };
  });
}
