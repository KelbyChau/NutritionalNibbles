"use client";

import { useEffect, useState } from "react";
import { BookmarkPlus, Check, LoaderCircle, TriangleAlert } from "lucide-react";

// Calls onSave and shows "Saved" for a moment, or the error it threw.
// onSave can return false to cancel (e.g. the recipe still needs a name).
// Without onSave it's UI only.
export function SaveButton({
  label = "Save recipe",
  onSave,
  disabled,
}: {
  label?: string;
  onSave?: () => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  async function save() {
    setState("saving");
    setError("");
    try {
      if ((await onSave?.()) === false) return setState("idle");
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
      setState("error");
    }
  }

  const Icon = {
    idle: BookmarkPlus,
    saving: LoaderCircle,
    saved: Check,
    error: TriangleAlert,
  }[state];
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={save}
        disabled={disabled || state === "saving"}
        aria-describedby={error ? "save-error" : undefined}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary px-5 text-[15px] font-medium text-secondary-foreground transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon className={state === "saving" ? "size-4 animate-spin" : "size-4"} />
        {state === "saving"
          ? "Saving…"
          : state === "saved"
            ? "Saved"
            : state === "error"
              ? "Try again"
              : label}
      </button>
      {error && (
        <span
          id="save-error"
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-card border border-destructive/30 bg-card p-3 text-xs text-destructive shadow-lift"
        >
          {error}
        </span>
      )}
    </span>
  );
}
