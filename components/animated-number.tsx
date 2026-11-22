"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * A number that rolls from its old value to the new one (300 ms, ease-out)
 * so a change in calories or protein is visible. `null` shows instantly,
 * and so does everything when the user asks for reduced motion.
 */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number | null;
  format: (n: number | null) => string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (value === null || start === null || reduce || start === value) {
      setShown(value);
      return;
    }
    const controls = animate(start, value, {
      duration: 0.3,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <span className="tabular-nums">{format(shown)}</span>;
}

// Whole numbers and percentages, for AnimatedNumber.
export function fmtCount(value: number | null) {
  return value === null ? "—" : String(Math.round(value));
}

export function fmtPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}
