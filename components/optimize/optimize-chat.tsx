"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Undo2,
  UtensilsCrossed,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { saveMyRecipe } from "@/lib/my-recipes";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { calculateNutrition, type Nutrients } from "@/lib/nutrition";
import {
  exactFood,
  foodLabel,
  foodSuggestions,
  type FoundationFood,
} from "@/lib/foundation-foods";
import { parseIngredient } from "@/lib/ingredients";
import { cn } from "@/lib/utils";
import {
  BUTTER,
  Combobox,
  IngredientArt,
  NutritionPanel,
  goals,
  ingredientOptions,
  loadDraft,
  makeIngredient,
  saveDraft,
  useUsdaFoods,
  type GoalKey,
  type Ingredient,
} from "./shared";
import {
  describeDelta,
  findSwapRule,
  scaleIngredient,
  suggestChanges,
  swapIngredient,
  type Change,
} from "./changes";

type Action =
  { type: "goal"; goal: GoalKey } | { type: "change"; change: Change };

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  actions?: Action[];
};

type Suggestion = {
  text: string;
  icon: LucideIcon;
  iconClass?: string;
  food?: FoundationFood;
};

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// Next keeps visited pages alive (cacheComponents + <Activity>), so without
// this a fresh visit would show the last recipe. Keying on bfcacheId starts a
// new page on every link/push, while the Back button still restores it.
export function OptimizeChat() {
  const { bfcacheId } = useRouter();
  return <OptimizeChatPage key={bfcacheId} />;
}

function OptimizeChatPage() {
  const { foods, status: catalogStatus } = useUsdaFoods();
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [original, setOriginal] = useState<Ingredient[]>([]);
  const [current, setCurrent] = useState<Ingredient[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Ingredient[][]>([]);
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const logEnd = useRef<HTMLDivElement>(null);

  const before = useMemo(
    () => calculateNutrition(original, servings),
    [original, servings],
  );
  const now = useMemo(
    () => calculateNutrition(current, servings),
    [current, servings],
  );

  // Load the recipe handed over by the builder.
  useEffect(() => {
    const draft = loadDraft();
    setLoaded(true);
    if (!draft || !draft.current.length) return;
    setTitle(draft.title);
    setServings(draft.servings);
    setOriginal(draft.original);
    setCurrent(draft.current);
    setSavedId(draft.savedId ?? null);
    nextId.current =
      Math.max(
        0,
        ...draft.current.map((i) => i.id),
        ...draft.original.map((i) => i.id),
      ) + 1;
    const n = calculateNutrition(draft.current, draft.servings).perServing;
    setMessages([
      {
        id: 0,
        role: "assistant",
        text:
          `Here's ${draft.title ? `your ${draft.title}` : "your recipe"}: ${draft.current.length} ingredients, ` +
          `${n.kcal === null ? "calories unavailable" : `about ${Math.round(n.kcal)} kcal`}` +
          `${n.protein === null ? "" : ` and ${Math.round(n.protein)} g protein`} per serving (estimated).\n\n` +
          "What do you want to optimize? Pick a goal, or tell me a change, like “swap heavy cream for Greek yogurt”, “use half the butter” or “change chicken to 300 g”.",
        actions: goals.map((g) => ({ type: "goal", goal: g.key })),
      },
    ]);
  }, []);

  // Keep the draft up to date so a refresh or "Edit ingredients" keeps changes.
  useEffect(() => {
    if (!loaded || !original.length) return;
    saveDraft({ title, servings, original, current, savedId });
  }, [loaded, title, servings, original, current, savedId]);

  function save() {
    const recipe = saveMyRecipe({ id: savedId, title, servings, ingredients: current });
    setSavedId(recipe.id);
  }

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function push(...msgs: Omit<Message, "id">[]) {
    setMessages((m) => [
      ...m,
      ...msgs.map((x) => ({ ...x, id: nextId.current++ })),
    ]);
  }

  function commit(
    next: Ingredient[],
    user: string,
    what: string,
    nextServings = servings,
  ) {
    const prev = calculateNutrition(current, servings).perServing;
    const after = calculateNutrition(next, nextServings).perServing;
    setHistory((h) => [...h, current]);
    setCurrent(next);
    push(
      { role: "user", text: user },
      { role: "assistant", text: `${what}\n${describeDelta(prev, after)}.` },
    );
  }

  function findIngredient(term: string) {
    const t = term
      .toLowerCase()
      .replace(/^(the|my)\s+/, "")
      .trim();
    if (!t) return undefined;
    const words = t.match(/[a-z0-9]+/g) ?? [];
    return (
      current.find((i) => i.name.toLowerCase().includes(t)) ??
      current.find((i) =>
        words.every((w) => i.food.description.toLowerCase().includes(w)),
      )
    );
  }

  function suggestFor(g: GoalKey, user: string, list = current) {
    const info = goals.find((x) => x.key === g)!;
    const changes = suggestChanges(g, list, servings, foods);
    if (catalogStatus) {
      return push(
        { role: "user", text: user },
        {
          role: "assistant",
          text: `Goal set: ${info.phrase}. ${catalogStatus} Try again in a moment.`,
        },
      );
    }
    const perNow = calculateNutrition(list, servings).perServing;
    push(
      { role: "user", text: user },
      changes.length
        ? {
            role: "assistant",
            text:
              `Goal: ${info.phrase}. Here are the changes that help most:\n\n` +
              changes
                .map(
                  (c, i) =>
                    `${i + 1}. ${c.label}: ${describeDelta(perNow, c.after)}.\n   ${c.note}`,
                )
                .join("\n") +
              "\n\nTap one to apply it, or tell me something else to change.",
            actions: changes.map((change) => ({ type: "change", change })),
          }
        : {
            role: "assistant",
            text:
              `Goal: ${info.phrase}. I don't have a swap that improves this for your current ingredients. ` +
              "Tell me a change you'd like to try, e.g. “swap X for Y”, “use 25% less X” or “remove X”, and I'll show the difference.",
          },
    );
  }

  function applyChange(change: Change) {
    if (!current.some((i) => i.id === change.id)) {
      return push({
        role: "assistant",
        text: "That ingredient has changed since, so I can't apply this one.",
      });
    }
    commit(change.apply(current), change.command, `Done: ${change.label}.`);
  }

  function handle(text: string, picked?: Suggestion) {
    const t = text.trim();
    if (!t) return;
    let m: RegExpMatchArray | null;

    if (/^undo$/i.test(t)) {
      const prev = history[history.length - 1];
      if (!prev)
        return push(
          { role: "user", text: t },
          { role: "assistant", text: "Nothing to undo." },
        );
      setHistory((h) => h.slice(0, -1));
      setCurrent(prev);
      return push(
        { role: "user", text: t },
        { role: "assistant", text: "Undid the last change." },
      );
    }

    if (/^(reset|start over|reset to the original)/i.test(t)) {
      return commit(original, t, "Back to your original recipe.");
    }

    if (
      (m = t.match(
        /^(?:make it |set |change to )?(?:serves\s+)?(\d+)\s*servings?$|^serves\s+(\d+)$/i,
      ))
    ) {
      const s = Math.min(24, Math.max(1, Number(m[1] ?? m[2])));
      const prev = calculateNutrition(current, servings).perServing;
      const after = calculateNutrition(current, s).perServing;
      setServings(s);
      return push(
        { role: "user", text: t },
        {
          role: "assistant",
          text: `Now ${s} servings.\n${describeDelta(prev, after)}.`,
        },
      );
    }

    if ((m = t.match(/^(?:remove|delete|drop|take out)\s+(.+)$/i))) {
      const hit = findIngredient(m[1]);
      if (!hit)
        return push(
          { role: "user", text: t },
          { role: "assistant", text: `I don't see “${m[1]}” in the recipe.` },
        );
      return commit(
        current.filter((i) => i.id !== hit.id),
        t,
        `Removed ${lower(hit.name)}.`,
      );
    }

    if (
      (m = t.match(
        /^(?:swap|replace|switch)\s+(.+?)\s+(?:for|with|to)\s+(.+)$/i,
      ))
    ) {
      const hit = findIngredient(m[1]);
      if (!hit)
        return push(
          { role: "user", text: t },
          { role: "assistant", text: `I don't see “${m[1]}” in the recipe.` },
        );
      const rule = findSwapRule(hit.food.fdc_id);
      let target: FoundationFood | undefined;
      if (/^(something|a)\s+(lighter|healthier|leaner|better)/i.test(m[2])) {
        target = rule && foods.find((f) => f.fdc_id === rule.to);
        if (!target) {
          return push(
            { role: "user", text: t },
            {
              role: "assistant",
              text: `I don't have a lighter swap for ${lower(hit.name)} yet. Name what you'd like instead, e.g. “swap ${lower(hit.name)} for …”.`,
            },
          );
        }
      } else {
        target = exactFood(foods, m[2]) ?? foodSuggestions(foods, m[2])[0];
      }
      if (!target) {
        return push(
          { role: "user", text: t },
          {
            role: "assistant",
            text: `I couldn't find “${m[2]}” in the USDA foods list. Try a simpler name, like “Greek yogurt”.`,
          },
        );
      }
      const factor = rule?.to === target.fdc_id ? rule.factor : undefined;
      return commit(
        swapIngredient(current, hit.id, target, factor),
        t,
        `Swapped ${lower(hit.name)} for ${lower(foodLabel(target.description))}.` +
          (rule?.to === target.fdc_id ? `\n${rule.note}` : ""),
      );
    }

    if (
      (m = t.match(
        /^(?:use\s+)?(?:(\d+)%\s+(less|more)|(half|double))\s+(?:the\s+|of\s+the\s+)?(.+)$/i,
      ))
    ) {
      const hit = findIngredient(m[4]);
      if (!hit)
        return push(
          { role: "user", text: t },
          { role: "assistant", text: `I don't see “${m[4]}” in the recipe.` },
        );
      const factor = m[3]
        ? m[3].toLowerCase() === "half"
          ? 0.5
          : 2
        : 1 + (m[2].toLowerCase() === "less" ? -1 : 1) * (Number(m[1]) / 100);
      if (factor <= 0)
        return commit(
          current.filter((i) => i.id !== hit.id),
          t,
          `Removed ${lower(hit.name)}.`,
        );
      return commit(
        scaleIngredient(current, hit.id, factor),
        t,
        `Changed ${lower(hit.name)}.`,
      );
    }

    if (
      (m = t.match(
        /^(?:change|set|make)\s+(.+?)\s+to\s+(\d+(?:\.\d+)?|\d+\/\d+)\s*(g|kg|oz|lb|cups?|tbsp|tsp|ml|l)?$/i,
      ))
    ) {
      const hit = findIngredient(m[1]);
      if (!hit)
        return push(
          { role: "user", text: t },
          { role: "assistant", text: `I don't see “${m[1]}” in the recipe.` },
        );
      const unit = m[3]
        ? m[3].toLowerCase().replace(/^cups$/, "cup")
        : hit.unit;
      return commit(
        current.map((i) =>
          i.id === hit.id ? { ...i, amount: m![2], unit } : i,
        ),
        t,
        `${hit.name} is now ${m[2]} ${unit}.`,
      );
    }

    if (/^add\s+/i.test(t)) {
      const raw = t.replace(/^add\s+/i, "");
      const parsed = parseIngredient(raw);
      const food =
        picked?.food ??
        (parsed &&
          (exactFood(foods, parsed.name) ??
            foodSuggestions(foods, parsed.name)[0]));
      if (!parsed || !food) {
        return push(
          { role: "user", text: t },
          {
            role: "assistant",
            text:
              catalogStatus ||
              "I couldn't find that in the USDA foods list. Pick one from the suggestions.",
          },
        );
      }
      const ing = makeIngredient(food, parsed, nextId.current++);
      return commit(
        [...current, ing],
        t,
        `Added ${ing.amount} ${ing.unit} ${lower(ing.name)}.`,
      );
    }

    const mentioned = goals.find((g) => g.words.test(t));
    if (mentioned) {
      setGoal(mentioned.key);
      return suggestFor(mentioned.key, t);
    }

    if (
      /\b(suggest|ideas?|what else|more|optimi[sz]e|help me)\b/i.test(t) &&
      goal
    ) {
      return suggestFor(goal, t);
    }

    push(
      { role: "user", text: t },
      {
        role: "assistant",
        text:
          "I can make these changes right now:\n" +
          "• a goal: “make it higher protein”, “lower calorie”, “lower carb”, “lower fat”\n" +
          "• “swap heavy cream for Greek yogurt” or “swap rice for something lighter”\n" +
          "• “use half the butter”, “use 25% less pasta”, “change chicken to 300 g”\n" +
          "• “remove garlic”, “add 100 g spinach”, “4 servings”, “undo”, “reset”\n\n" +
          "Free-form requests need the AI optimizer, which isn't connected yet.",
        actions: goal
          ? undefined
          : goals.map((g) => ({ type: "goal", goal: g.key })),
      },
    );
  }

  function runAction(a: Action) {
    if (a.type === "goal") {
      const info = goals.find((g) => g.key === a.goal)!;
      setGoal(a.goal);
      suggestFor(a.goal, `Make it ${info.phrase}`);
    } else {
      applyChange(a.change);
    }
  }

  const suggestions = useMemo(
    () => chatSuggestions(input, current, foods),
    [input, current, foods],
  );

  if (loaded && !original.length) {
    return (
      <Shell title={title}>
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
          <span className="text-7xl" aria-hidden>
            🍽️
          </span>
          <h2 className="mt-4 font-display text-4xl leading-tight">
            No recipe to optimize yet
          </h2>
          <p className="mt-3 text-muted-foreground">
            Add your ingredients first, then press Optimize to come here.
          </p>
          <Link
            href="/optimize"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            <ArrowLeft className="size-4" />
            Add ingredients
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={title} onSave={current.length ? save : undefined}>
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-5 pt-4 sm:px-6 lg:px-8 xl:flex-row">
        {/* Chat */}
        <section className="flex min-h-[32rem] min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ol
              aria-live="polite"
              className="mx-auto flex max-w-3xl flex-col gap-4 pb-4"
            >
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {m.role === "assistant" && (
                    <span
                      className={cn(
                        "mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[hsl(229_73%_48%)]",
                        BUTTER,
                      )}
                    >
                      <WandSparkles className="size-4" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "flex max-w-[85%] flex-col gap-2",
                      m.role === "user" && "items-end",
                    )}
                  >
                    <p
                      className={cn(
                        "whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "surface-paper rounded-bl-md border border-border bg-card",
                      )}
                    >
                      {m.text}
                    </p>
                    {m.actions && (
                      <div className="flex flex-wrap gap-2">
                        {m.actions.map((a, i) => (
                          <ActionButton
                            key={i}
                            action={a}
                            onRun={() => runAction(a)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <div ref={logEnd} />
          </div>

          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-2 flex flex-wrap gap-2">
              {goals.map((g) => {
                const Icon = g.icon;
                const on = goal === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => runAction({ type: "goal", goal: g.key })}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-foreground/40",
                    )}
                  >
                    <Icon className={cn("size-3.5", !on && g.color)} />
                    {g.label}
                  </button>
                );
              })}
            </div>
            <Combobox
              value={input}
              onChange={setInput}
              onSubmit={(text, option) => {
                handle(text, option);
                setInput("");
              }}
              options={suggestions}
              renderIcon={(o) => (
                <o.icon className={cn("size-4", o.iconClass)} />
              )}
              placeholder="Tell me what to change: “swap butter for…”, “use less pasta”…"
              label="Tell the optimizer what to change"
              leading={<Sparkles className="size-4 text-primary" />}
              sendButton
              size="lg"
              listPosition="above"
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Nutrition is estimated from USDA values. Not medical advice.
            </p>
          </div>
        </section>

        {/* Recipe + comparison */}
        <aside
          aria-label="Your recipe"
          className="flex min-h-0 shrink-0 flex-col gap-4 xl:w-[21rem]"
        >
          <Comparison
            before={before.perServing}
            now={now.perServing}
            goal={goal}
          />
          <div className="surface-paper flex min-h-0 flex-1 flex-col rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl leading-none">
                Ingredients
              </h2>
              <div className="flex gap-1">
                <IconButton
                  label="Undo"
                  icon={Undo2}
                  disabled={!history.length}
                  onClick={() => handle("undo")}
                />
                <IconButton
                  label="Reset to original"
                  icon={RotateCcw}
                  disabled={current === original}
                  onClick={() => handle("reset")}
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              Servings
              <IconButton
                label="Fewer servings"
                icon={Minus}
                small
                onClick={() => handle(`${Math.max(1, servings - 1)} servings`)}
              />
              <span className="font-semibold tabular-nums text-foreground">
                {servings}
              </span>
              <IconButton
                label="More servings"
                icon={Plus}
                small
                onClick={() => handle(`${Math.min(24, servings + 1)} servings`)}
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
                      onClick={() => handle(`remove ${ing.name}`)}
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
        </aside>

        {/* Nutrition */}
        <aside
          aria-label="Estimated nutrition"
          className="flex min-h-0 shrink-0 flex-col xl:w-[19rem]"
        >
          <NutritionPanel
            nutrition={now}
            servings={servings}
            hasIngredients={current.length > 0}
          />
        </aside>
      </div>
    </Shell>
  );
}

// ---- Pieces ------------------------------------------------------------------

function Shell({
  title,
  onSave,
  children,
}: {
  title: string;
  /** Shown only when there's a recipe to save. */
  onSave?: () => void;
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
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40"
        >
          <ArrowLeft className="size-4" />
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
function ActionButton({
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
      Apply: {action.change.label}
    </button>
  );
}

function IconButton({
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

function Comparison({
  before,
  now,
  goal,
}: {
  before: Nutrients;
  now: Nutrients;
  goal: GoalKey | null;
}) {
  const rows: {
    key: keyof Nutrients;
    label: string;
    unit: string;
    goal: GoalKey;
    better: "up" | "down";
  }[] = [
    {
      key: "kcal",
      label: "Calories",
      unit: " kcal",
      goal: "calories",
      better: "down",
    },
    {
      key: "protein",
      label: "Protein",
      unit: " g",
      goal: "protein",
      better: "up",
    },
    { key: "carbs", label: "Carbs", unit: " g", goal: "carbs", better: "down" },
    { key: "fat", label: "Fat", unit: " g", goal: "fat", better: "down" },
  ];
  return (
    <section className="surface-paper rounded-3xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl leading-none">Before → Now</h2>
        <span className="text-[11px] text-muted-foreground">per serving</span>
      </div>
      <dl className="mt-3 flex flex-col">
        {rows.map((r) => {
          const a = before[r.key];
          const b = now[r.key];
          const d = a === null || b === null ? null : b - a;
          const good =
            d !== null &&
            Math.abs(d) >= 0.5 &&
            (r.better === "up" ? d > 0 : d < 0);
          const bad = d !== null && Math.abs(d) >= 0.5 && !good;
          return (
            <div
              key={r.key}
              className={cn(
                "grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-b border-border py-1.5 text-sm last:border-0",
                goal === r.goal && "font-semibold",
              )}
            >
              <dt className="flex items-center gap-1.5">
                {r.label}
                {goal === r.goal && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium">
                    goal
                  </span>
                )}
              </dt>
              <dd className="tabular-nums text-muted-foreground">
                {a === null ? "—" : Math.round(a)} →{" "}
                <span className="text-foreground">
                  {b === null ? "—" : Math.round(b)}
                  {r.unit}
                </span>
              </dd>
              <dd
                className={cn(
                  "w-14 text-right text-xs tabular-nums",
                  good && "text-macro-protein",
                  bad && "text-macro-fat",
                  !good && !bad && "text-muted-foreground",
                )}
              >
                {d === null
                  ? ""
                  : Math.abs(d) < 0.5
                    ? "same"
                    : `${d > 0 ? "+" : "−"}${Math.round(Math.abs(d))}`}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function chatSuggestions(
  raw: string,
  ingredients: Ingredient[],
  foods: FoundationFood[],
): Suggestion[] {
  const q = raw.trim();
  if (!q) return [];
  const out: Suggestion[] = [];

  if (/^(ad|add)\b/i.test(q)) {
    for (const option of ingredientOptions(
      q.replace(/^add\s*/i, ""),
      foods,
    ).slice(0, 4)) {
      out.push({
        text: "Add " + option.text,
        food: option.food,
        icon: Plus,
        iconClass: "text-primary",
      });
    }
  }

  const byId = new Map(foods.map((f) => [f.fdc_id, f]));
  const actions: Suggestion[] = [
    ...goals.map((g) => ({
      text: `Make it ${g.phrase}`,
      icon: g.icon,
      iconClass: g.color,
    })),
    ...ingredients.flatMap((i) => {
      const rule = findSwapRule(i.food.fdc_id);
      const to = rule && byId.get(rule.to);
      const name = lower(i.name);
      return [
        ...(to
          ? [
              {
                text: `Swap ${name} for ${lower(to.description)}`,
                icon: WandSparkles,
                iconClass: "text-primary",
              },
            ]
          : []),
        { text: `Use half the ${name}`, icon: Minus },
        { text: `Use 25% less ${name}`, icon: Minus },
        { text: `Remove ${name}`, icon: X },
      ];
    }),
    { text: "Undo", icon: Undo2 },
    { text: "Reset to the original", icon: RotateCcw },
    { text: "4 servings", icon: UtensilsCrossed },
  ];
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  for (const a of actions) {
    const words = a.text.toLowerCase().split(/[\s,()]+/);
    if (
      a.text.toLowerCase() !== q.toLowerCase() &&
      tokens.every((t) => words.some((w) => w.startsWith(t)))
    ) {
      out.push(a);
    }
  }
  return out.slice(0, 6);
}
