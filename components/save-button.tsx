"use client";

import { useEffect, useState } from "react";
import { BookmarkPlus, Check, TriangleAlert } from "lucide-react";

// Calls onSave and shows "Saved" (or "Couldn't save") for a moment.
// onSave can return false to cancel (e.g. the recipe still needs a name).
// Without onSave it's UI only.
export function SaveButton({
  label = "Save recipe",
  onSave,
  disabled,
}: {
  label?: string;
  onSave?: () => boolean | void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  function save() {
    try {
      if (onSave?.() === false) return;
      setState("saved");
    } catch {
      setState("error");
    }
  }

  const Icon =
    state === "saved" ? Check : state === "error" ? TriangleAlert : BookmarkPlus;
  return (
    <button
      type="button"
      onClick={save}
      disabled={disabled}
      aria-live="polite"
      className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon className="size-4" />
      {state === "saved"
        ? "Saved"
        : state === "error"
          ? "Couldn’t save"
          : label}
    </button>
  );
}
