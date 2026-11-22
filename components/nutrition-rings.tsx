"use client";

// Activity-style nutrition rings: calories, protein, carbs and fat from the
// outside in, each filling to its daily value. The fill animates from the
// previous value when the numbers change, so an edit visibly moves the
// rings; with reduced motion they're drawn in place.

import { useSyncExternalStore, type ReactNode } from "react";
import { motion } from "motion/react";
import type { Ring } from "@/lib/nutrition-rings";
import { cn } from "@/lib/utils";

const color = (key: Ring["key"]) => `hsl(var(--nutrient-${key}))`;

// The OS "reduce motion" setting. Read with useSyncExternalStore so rings
// rendered on the server (where it can't be known) switch to the real
// setting as soon as the page loads, instead of keeping the server's guess.
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

const amount = (ring: Ring) =>
  ring.value === null
    ? "—"
    : `${ring.unit === "kcal" ? Math.round(ring.value) : Math.round(ring.value * 10) / 10}${ring.unit === "kcal" ? " kcal" : " g"}`;

const percent = (ring: Ring) =>
  ring.value === null ? "" : `${Math.round((ring.value / ring.dailyValue) * 100)}%`;

export function NutritionRings({
  rings,
  size = 160,
  stroke = 14,
  gap = 3,
  showLegend = true,
  testId = "rings",
  className,
  children,
}: {
  rings: Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
  showLegend?: boolean;
  testId?: string;
  className?: string;
  children?: ReactNode; // shown in the middle, e.g. the calorie number
}) {
  const reduce = usePrefersReducedMotion();
  const summary = rings
    .map((r) => `${r.label} ${amount(r)}${r.value === null ? "" : `, ${percent(r)} of daily value`}`)
    .join("; ");

  return (
    <div
      data-testid={testId}
      data-animate={reduce ? "false" : "true"}
      className={cn("flex items-center gap-5", className)}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={summary}>
          {rings.map((ring, i) => {
            const r = (size - stroke) / 2 - i * (stroke + gap);
            if (r <= stroke / 2) return null;
            const common = {
              cx: size / 2,
              cy: size / 2,
              r,
              fill: "none",
              strokeWidth: stroke,
              stroke: color(ring.key),
            };
            return (
              <g key={ring.key} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                <circle {...common} strokeOpacity={0.16} />
                <motion.circle
                  {...common}
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: ring.fraction, opacity: ring.fraction > 0 ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </g>
            );
          })}
        </svg>
        {children && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
        )}
      </div>

      {showLegend && (
        <ul className="grid min-w-0 flex-1 gap-2 text-sm" aria-hidden>
          {rings.map((ring) => (
            <li key={ring.key} className="flex items-baseline gap-2">
              <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: color(ring.key) }} />
              <span className="text-muted-foreground">{ring.label}</span>
              <span className="ml-auto font-rounded font-semibold tabular-nums">
                {amount(ring)}
                {ring.partial && <sup>†</sup>}
              </span>
              <span className="w-10 text-right font-rounded text-xs tabular-nums text-muted-foreground">{percent(ring)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
