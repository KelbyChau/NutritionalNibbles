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
      <header className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-5 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="NutritionalNibbles home"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-3xl leading-none text-primary-foreground"
        >
          N
        </Link>
        <div className="mr-auto min-w-0">
          <h1 className="font-display text-3xl leading-none tracking-tight sm:text-4xl">
            Optimize
          </h1>
          {title && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {title}
            </p>
          )}
        </div>
        <Link
          href="/optimize?draft=1"
          aria-label="Edit ingredients"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">Edit ingredients</span>
        </Link>
        {onSave && <SaveButton onSave={onSave} />}
        <div className="flex h-11 items-center rounded-full border border-border bg-card px-1">
          <ThemeSwitcher />
        </div>
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
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs transition-colors hover:border-primary"
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
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-left text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
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
        "flex shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-30",
        small
          ? "size-6 bg-muted hover:bg-primary hover:text-primary-foreground"
          : "size-8",
      )}
    >
      <Icon className={small ? "size-3" : "size-4"} />
    </button>
  );
}
