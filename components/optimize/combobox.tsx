"use client";

// Text input with a suggestion popup.

import { useEffect, useId, useState } from "react";
import { ArrowUp, type LucideIcon } from "lucide-react";
import type { FoundationFood } from "@/lib/foundation-foods";
import { cn } from "@/lib/utils";
import { SHADOW } from "./shared";

export function Combobox<
  T extends { text: string; icon?: LucideIcon; food?: FoundationFood },
>({
  value,
  onChange,
  onSubmit,
  options,
  renderIcon,
  placeholder,
  label,
  leading,
  sendButton,
  error,
  listPosition,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string, option?: T) => void;
  options: T[];
  renderIcon: (o: T) => React.ReactNode;
  placeholder: string;
  label: string;
  leading: React.ReactNode;
  sendButton?: boolean;
  error?: string;
  listPosition: "above" | "below";
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const show = open && options.length > 0;

  useEffect(() => setActive(-1), [value]);

  function pick(text: string, option?: T) {
    onSubmit(text, option);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (show && e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (show && e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (show && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      onChange(options[Math.max(0, active)].text);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (show && active >= 0) pick(options[active].text, options[active]);
      else if (value.trim()) pick(value);
    }
  }

  return (
    <div className="relative">
      {show && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          className={cn(
            "surface-paper absolute inset-x-0 z-30 overflow-hidden rounded-3xl border border-border bg-card p-1.5",
            SHADOW,
            listPosition === "above" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {options.map((o, i) => (
            <li
              key={o.text + i}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the input
                pick(o.text, o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm",
                i === active && "bg-muted",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background">
                {renderIcon(o)}
              </span>
              <span className="truncate">{o.text}</span>
            </li>
          ))}
          <li
            aria-hidden
            className="px-3 pb-1 pt-1.5 text-[11px] text-muted-foreground"
          >
            ↑↓ to move · Enter to pick · Tab to fill in · Esc to close
          </li>
        </ul>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-card pl-4 pr-1.5 focus-within:border-primary",
          size === "lg" ? "h-14" : "h-12",
          error ? "border-destructive" : "border-border",
          sendButton && "shadow-[0_16px_40px_-28px_hsl(230_60%_15%/0.5)]",
        )}
      >
        {leading}
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            show && active >= 0 ? `${listId}-${active}` : undefined
          }
          aria-invalid={!!error}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            size === "lg" ? "text-base" : "text-sm",
          )}
        />
        {sendButton ? (
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => pick(value)}
            aria-label="Send"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors disabled:bg-muted disabled:text-muted-foreground",
              size === "lg" ? "size-11" : "size-9",
            )}
          >
            <ArrowUp className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => pick(value)}
            className="h-9 shrink-0 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors disabled:bg-muted disabled:text-muted-foreground"
          >
            Add
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 pl-4 text-xs text-destructive">{error}</p>}
    </div>
  );
}
