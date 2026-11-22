"use client";

// The plate in the middle of the builder, with ingredient art arranged on it.

import { AnimatePresence, motion } from "motion/react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { IngredientArt, type Ingredient } from "../shared";

// Where ingredient art sits on the stage, in % of the stage box. The first
// ingredient takes the big center spot; the rest scatter around it.
export const spots = [
  { left: 50, top: 50, size: 11 },
  { left: 24, top: 30, size: 6.5 },
  { left: 76, top: 28, size: 6.5 },
  { left: 22, top: 72, size: 6 },
  { left: 78, top: 72, size: 6 },
  { left: 50, top: 16, size: 5 },
  { left: 50, top: 86, size: 5 },
  { left: 10, top: 50, size: 4.5 },
  { left: 90, top: 50, size: 4.5 },
];

export function Stage({
  title,
  onTitle,
  ingredients,
  nameMissing,
  inputRef,
}: {
  title: string;
  onTitle: (t: string) => void;
  ingredients: Ingredient[];
  nameMissing: boolean;
  inputRef: React.Ref<HTMLInputElement>;
}) {
  const shown = ingredients.slice(0, spots.length);
  return (
    <div className="relative mb-4 min-h-[20rem] flex-1">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Name your dish"
        aria-label="Dish name"
        aria-required
        aria-invalid={nameMissing || undefined}
        aria-describedby={nameMissing ? "dish-name-error" : undefined}
        className={cn(
          "relative z-10 w-full rounded-xl border-b-2 border-transparent bg-transparent text-[clamp(1.5rem,5vw,3rem)] font-semibold leading-tight tracking-[-0.02em] outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring",
          nameMissing && "border-destructive placeholder:text-destructive/70",
        )}
      />
      {nameMissing && (
        <p
          id="dish-name-error"
          role="alert"
          className="relative z-10 mt-1 text-sm font-medium text-destructive"
        >
          Add a name for your recipe first.
        </p>
      )}
      <div className="absolute inset-0 top-14 flex items-center justify-center">
        {/* the plate: a white dish on the gray canvas */}
        <div className="relative aspect-square h-full max-h-[30rem] max-w-full">
          <div
            aria-hidden
            className={cn(
              "absolute inset-[4%] rounded-full bg-card shadow-lift ring-1 ring-border/50 dark:shadow-none",
            )}
          />
          {/* New ingredients pop onto the plate, removed ones shrink away, and
              the rest glide to their new spot (CSS transition on left/top).
              Centering uses motion's x/y so it composes with the scale. */}
          <AnimatePresence initial={false}>
            {shown.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center text-foreground"
              >
                <span
                  aria-hidden
                  className="flex size-20 items-center justify-center rounded-full bg-primary/10"
                >
                  <UtensilsCrossed className="size-9 text-primary" />
                </span>
                <p className="mt-4 max-w-[20ch] text-[21px] font-semibold leading-snug tracking-[-0.01em]">
                  Add ingredients and they show up here
                </p>
              </motion.div>
            ) : (
              shown.map((ing, idx) => {
                const spot = spots[idx];
                return (
                  <motion.div
                    key={ing.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
                    }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
                    style={{
                      left: `${spot.left}%`,
                      top: `${spot.top}%`,
                      x: "-50%",
                      y: "-50%",
                    }}
                    title={ing.name}
                  >
                    <IngredientArt
                      ingredient={ing}
                      sizeRem={spot.size}
                      className="drop-shadow-[0_12px_14px_rgb(0_0_0/0.18)]"
                    />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
          {ingredients.length > spots.length && (
            <span className="absolute bottom-2 right-2 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium">
              +{ingredients.length - spots.length} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
