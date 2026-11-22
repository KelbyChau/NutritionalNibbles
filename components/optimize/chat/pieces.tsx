"use client";

// Page frame and buttons for the optimizer chat.

import Link from "next/link";
import { ArrowLeft, Check, type LucideIcon } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";
import { goals } from "../shared";
import type { Action } from "./types";

export function Shell({
  title,
  onSave,
  children,
}: {
  title: string;
  /** Shown only when there's a recipe to save. */
  onSave?: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background xl:h-dvh xl:overflow-hidden">
      <header className="surface-glass sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-6 lg:px-8 xl:static xl:border-0 xl:bg-transparent xl:pt-5 xl:backdrop-blur-none">
        <Link
          href="/"
          aria-label="NutritionalNibbles home"
          className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary text-[20px] font-semibold leading-none text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          N
        </Link>
        <div className="mr-auto min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] sm:text-[28px]">
            Optimize
          </h1>
          {title && (
            <p className="truncate text-[13px] text-muted-foreground">
              {title}
            </p>
          )}
        </div>
        <Link
          href="/optimize?draft=1"
          aria-label="Edit ingredients"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Edit ingredients</span>
        </Link>
        {onSave && <SaveButton onSave={onSave} />}
        <ThemeSwitcher />
      </header>
      {children}
    </div>
  );
}

// UI only for now: nothing is stored yet. Hook this up to the recipes
// table (insert the current ingredients + nutrition) when saving is built.
export function ActionButton({
  action,
  onRun,
}: {
  action: Action;
  onRun: () => void;
}) {
  if (action.type === "goal") {
    const g = goals.find((x) => x.key === action.goal)!;
    const Icon = g.icon;
    return (
      <button
        type="button"
        onClick={onRun}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-[13px] font-medium transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className={cn("size-3.5", g.color)} />
        {g.label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onRun}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-left text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Check className="size-3.5 shrink-0" />
      Apply: {action.type === "nutrientSwap" ? action.label : action.change.label}
    </button>
  );
}

export function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  small,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30",
        small
          ? "size-7 bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-primary hover:text-primary-foreground"
          : "size-8 text-muted-foreground",
      )}
    >
      <Icon className={small ? "size-3" : "size-4"} />
    </button>
  );
}
