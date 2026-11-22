"use client";

// Pieces shared by the recipe builder (/optimize) and the optimize chat
// (/optimize/chat): the ingredient type, goals, colors, ingredient art and
// stat tiles. See also ingredients.ts, draft.ts, combobox.tsx and
// nutrition-panel.tsx.

import Image from "next/image";
import {
  AnimatedNumber,
  fmtCount,
  fmtPercent,
} from "@/components/animated-number";
import {
  Droplet,
  Dumbbell,
  Flame,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { ingredientImage, type IngredientInfo } from "@/lib/ingredients";
import type { UsdaFood } from "@/lib/foundation-foods";
import { cn } from "@/lib/utils";

export type GoalKey = "protein" | "calories" | "carbs" | "fat";

export const goals: {
  key: GoalKey;
  label: string;
  phrase: string;
  icon: LucideIcon;
  color: string;
  words: RegExp;
}[] = [
  {
    key: "protein",
    label: "Higher protein",
    phrase: "higher protein",
    icon: Dumbbell,
    color: "text-macro-protein",
    words: /protein/i,
  },
  {
    key: "calories",
    label: "Lower calorie",
    phrase: "lower calorie",
    icon: Flame,
    color: "text-macro-fat",
    words: /calori|kcal|lighter/i,
  },
  {
    key: "carbs",
    label: "Lower carb",
    phrase: "lower carb",
    icon: Wheat,
    color: "text-macro-carbs",
    words: /carb|keto/i,
  },
  {
    key: "fat",
    label: "Lower fat",
    phrase: "lower fat",
    icon: Droplet,
    color: "text-macro-fat",
    words: /\bfat\b/i,
  },
];

export type Ingredient = IngredientInfo & {
  food: UsdaFood;
  id: number;
  amount: string;
  unit: string;
};

// The landing page's butter yellow, fixed so it reads the same in both themes.
// Backdrop behind ingredient art and small icons.
export const BUTTER = "bg-muted";
export const SHADOW = "shadow-lift";

// ---- Small UI pieces ---------------------------------------------------------

export { AnimatedNumber, fmtCount, fmtPercent };

export function IngredientArt({
  ingredient,
  sizeRem,
  className,
}: {
  ingredient: IngredientInfo;
  sizeRem: number;
  className?: string;
}) {
  return (
    <Image
      src={ingredient.image ?? ingredientImage(ingredient.name)}
      alt={ingredient.name}
      width={224}
      height={224}
      unoptimized
      style={{ width: `${sizeRem}rem`, height: `${sizeRem}rem` }}
      // Grows/shrinks smoothly when it moves to a bigger or smaller plate spot.
      className={cn(
        "object-contain transition-[width,height] duration-300 ease-out motion-reduce:transition-none",
        className,
      )}
    />
  );
}

export function Stat({
  icon: Icon,
  label,
  value,
  number,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  /** Shown as-is; ignored when `number` is given. */
  value?: string;
  /** Rolls to each new value (see AnimatedNumber). */
  number?: { value: number | null; format: (n: number | null) => string };
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col-reverse">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "truncate font-semibold tabular-nums",
            muted && "font-normal text-muted-foreground",
          )}
        >
          {number ? <AnimatedNumber {...number} /> : value}
        </dd>
      </div>
    </div>
  );
}
