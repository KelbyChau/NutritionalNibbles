"use client";

// The recipe card beside the chat: undo/reset, servings, and each ingredient
// tagged New, Swapped, Changed or Removed against the original. Every button
// sends the same command as typing it in the chat.

import { Minus, Plus, RotateCcw, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber, BUTTER, fmtCount, IngredientArt, type Ingredient } from "../shared";
import { IconButton } from "./pieces";

export function RecipeList({
  current,
  original,
  servings,
  canUndo,
  onCommand,
}: {
  current: Ingredient[];
  original: Ingredient[];
  servings: number;
  canUndo: boolean;
  onCommand: (text: string) => void;
}) {
  return (
      <div className="surface-paper flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl leading-none">
            Ingredients
          </h2>
          <div className="flex gap-1">
            <IconButton
              label="Undo"
              icon={Undo2}
              disabled={!canUndo}
              onClick={() => onCommand("undo")}
            />
            <IconButton
              label="Reset to original"
              icon={RotateCcw}
              disabled={current === original}
              onClick={() => onCommand("reset")}
            />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          Servings
          <IconButton
            label="Fewer servings"
            icon={Minus}
            small
            onClick={() => onCommand(`${Math.max(1, servings - 1)} servings`)}
          />
          <span className="font-semibold tabular-nums text-foreground">
            <AnimatedNumber value={servings} format={fmtCount} />
          </span>
          <IconButton
            label="More servings"
            icon={Plus}
            small
            onClick={() => onCommand(`${Math.min(24, servings + 1)} servings`)}
          />
        </div>
        <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {current.map((ing) => {
            const was = original.find((o) => o.id === ing.id);
            const tag = !was
              ? "New"
              : was.food.fdc_id !== ing.food.fdc_id
                ? "Swapped"
                : was.amount !== ing.amount || was.unit !== ing.unit
                  ? "Changed"
                  : null;
            return (
              <li
                key={ing.id}
                className="flex items-center gap-3 rounded-2xl border border-border p-2 pr-1"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    BUTTER,
                  )}
                >
                  <IngredientArt ingredient={ing} sizeRem={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium"
                    title={ing.name}
                  >
                    {ing.name}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {ing.amount} {ing.unit}
                    {tag && (
                      <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-medium text-primary-foreground">
                        {tag}
                      </span>
                    )}
                  </p>
                  {tag === "Swapped" && was && (
                    <p
                      className="truncate text-[11px] text-muted-foreground line-through"
                      title={was.name}
                    >
                      {was.name}
                    </p>
                  )}
                </div>
                <IconButton
                  label={`Remove ${ing.name}`}
                  icon={X}
                  onClick={() => onCommand(`remove ${ing.name}`)}
                />
              </li>
            );
          })}
          {original
            .filter((o) => !current.some((c) => c.id === o.id))
            .map((o) => (
              <li
                key={`removed-${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-2 text-muted-foreground"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted opacity-60">
                  <IngredientArt ingredient={o} sizeRem={1.75} />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm line-through">
                  {o.name}
                </p>
                <span className="pr-2 text-[10px] uppercase tracking-wide">
                  Removed
                </span>
              </li>
            ))}
        </ul>
      </div>
  );
}
