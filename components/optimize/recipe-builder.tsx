"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Droplet,
  Dumbbell,
  Flame,
  LayoutGrid,
  Minus,
  Plus,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  UtensilsCrossed,
  WandSparkles,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  commonIngredients,
  formatAmount,
  lookupIngredient,
  parseIngredient,
  type IngredientInfo,
} from "@/lib/ingredients";
import {
  calculateNutrition,
  dailyValues,
  type Nutrients,
  type RecipeNutrition,
} from "@/lib/nutrition";
import { cn } from "@/lib/utils";

type GoalKey = "protein" | "calories" | "carbs" | "fat";

const goals: {
  key: GoalKey;
  label: string;
  phrase: string;
  icon: LucideIcon;
  color: string;
  words: RegExp;
}[] = [
  {
    key: "protein",
    label: "Higher protein",
    phrase: "higher protein",
    icon: Dumbbell,
    color: "text-macro-protein",
    words: /protein/i,
  },
  {
    key: "calories",
    label: "Lower calorie",
    phrase: "lower calorie",
    icon: Flame,
    color: "text-macro-fat",
    words: /calori|kcal|lighter/i,
  },
  {
    key: "carbs",
    label: "Lower carb",
    phrase: "lower carb",
    icon: Wheat,
    color: "text-macro-carbs",
    words: /carb|keto/i,
  },
  {
    key: "fat",
    label: "Lower fat",
    phrase: "lower fat",
    icon: Droplet,
    color: "text-macro-fat",
    words: /\bfat\b/i,
  },
];

type Ingredient = IngredientInfo & { id: number; amount: string; unit: string };
type Message = { id: number; role: "user" | "assistant"; text: string };
type Suggestion = { text: string; icon: LucideIcon; iconClass?: string };

// The landing page's butter yellow, fixed so it reads the same in both themes.
const BUTTER = "bg-[hsl(45_84%_72%)]";
const SHADOW = "shadow-[0_24px_48px_-24px_hsl(230_60%_15%/0.45)]";

// Where ingredient art sits on the stage, in % of the stage box. The first
// ingredient takes the big center spot; the rest scatter around it.
const spots = [
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

export function RecipeBuilder() {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(1);

  const goalInfo = goals.find((g) => g.key === goal) ?? null;
  const realNutrition = useMemo(
    () => calculateNutrition(ingredients, servings),
    [ingredients, servings],
  );
  // Until the user adds something, show sample numbers so the layout is visible.
  const isSample = SHOW_SAMPLE_NUTRITION && ingredients.length === 0;
  const sampleNutrition = useMemo(
    () => calculateNutrition(sampleIngredients, servings),
    [servings],
  );
  const nutrition = isSample ? sampleNutrition : realNutrition;

  function addIngredients(texts: string[]) {
    const added: Ingredient[] = [];
    for (const t of texts) {
      const parsed = parseIngredient(t);
      if (!parsed) continue;
      added.push({
        ...lookupIngredient(parsed.name),
        id: nextId.current++,
        amount: parsed.amount,
        unit: parsed.unit,
      });
    }
    if (added.length) setIngredients((list) => [...list, ...added]);
    return added;
  }

  function removeIngredient(id: number) {
    setIngredients((list) => list.filter((i) => i.id !== id));
  }

  function say(user: string, reply: string) {
    setMessages((m) => [
      ...m,
      { id: nextId.current++, role: "user", text: user },
      { id: nextId.current++, role: "assistant", text: reply },
    ]);
  }

  // Chat commands are handled here. Anything that needs the real optimizer
  // gets a placeholder reply until that backend exists.
  function handleChat(text: string) {
    const t = text.trim();
    if (!t) return;

    const remove = t.match(/^(?:remove|delete|drop)\s+(.+)$/i);
    if (remove) {
      const term = remove[1].toLowerCase();
      const hit = ingredients.find((i) => i.name.toLowerCase().includes(term));
      if (hit) {
        removeIngredient(hit.id);
        return say(t, `Removed ${hit.name.toLowerCase()}.`);
      }
      return say(t, `I don't see "${remove[1]}" in your ingredients.`);
    }

    const mentionedGoal = goals.find((g) => g.words.test(t));
    if (
      mentionedGoal &&
      /\b(make|higher|lower|more|less|fewer|goal|cut)\b/i.test(t)
    ) {
      setGoal(mentionedGoal.key);
      return say(
        t,
        `Goal set: ${mentionedGoal.phrase}.` +
          (ingredients.length
            ? " Press Optimize when your ingredient list is ready."
            : " Now add your ingredients, e.g. “add 200g chicken breast”."),
      );
    }

    if (/^swap\b/i.test(t)) {
      return say(
        t,
        "Noted. Swap suggestions will come from the optimizer, which isn't connected yet.",
      );
    }

    if (/^add\s+/i.test(t) || /^\d/.test(t)) {
      const parts = t
        .replace(/^add\s+/i, "")
        .split(/,|\band\b/i)
        .map((p) => p.trim())
        .filter(Boolean);
      const added = addIngredients(parts);
      return say(
        t,
        added.length
          ? `Added ${added.map((a) => `${formatAmount(a).toLowerCase()} ${a.name.toLowerCase()}`.replace(/^to taste /, "")).join(", ")}.`
          : "I couldn't read an ingredient there. Try “add 2 eggs”.",
      );
    }

    say(t, summary());
  }

  function summary() {
    const missing: string[] = [];
    if (!ingredients.length) missing.push("add some ingredients");
    if (!goalInfo) missing.push("pick a goal");
    if (missing.length) return `To get started, ${missing.join(" and ")}.`;
    const per = realNutrition.perServing;
    return `${ingredients.length} ingredients, ${servings} servings, about ${Math.round(per.kcal)} kcal and ${Math.round(per.protein)}g protein per serving (estimated). Goal: ${goalInfo!.phrase}. (The optimizer isn't connected yet, so this is a placeholder reply.)`;
  }

  function optimize() {
    say(
      `Optimize${title ? ` ${title}` : " my recipe"}${goalInfo ? ` for ${goalInfo.phrase}` : ""}`,
      summary(),
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background xl:h-dvh xl:overflow-hidden">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-5 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="NutritionalNibbles home"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-display text-3xl leading-none text-primary-foreground"
        >
          N
        </Link>
        <h1 className="mr-auto font-display text-3xl leading-none tracking-tight sm:text-4xl">
          New Recipe
        </h1>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm transition-colors hover:border-foreground/40"
        >
          <LayoutGrid className="size-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <div className="flex h-11 items-center rounded-full border border-border bg-card px-1">
          <ThemeSwitcher />
        </div>
        <Button
          onClick={optimize}
          className="h-11 rounded-full px-5 shadow-none"
        >
          <WandSparkles />
          Optimize
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-5 pt-4 sm:px-6 lg:px-8 xl:flex-row xl:gap-6">
        {/* Stage + stats + chat */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {goals.map((g) => {
              const Icon = g.icon;
              const on = goal === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGoal(on ? null : g.key)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-foreground/40",
                  )}
                >
                  <Icon className={cn("size-4", !on && g.color)} />
                  {g.label}
                </button>
              );
            })}
          </div>

          <Stage title={title} onTitle={setTitle} ingredients={ingredients} />

          <div className="surface-paper rounded-3xl bg-card p-4 shadow-[0_24px_48px_-32px_hsl(230_60%_15%/0.45)] sm:px-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                icon={Flame}
                label="Calories / serving"
                value={
                  nutrition.counted
                    ? `${Math.round(nutrition.perServing.kcal)} kcal`
                    : "–"
                }
              />
              <Stat
                icon={Dumbbell}
                label="Protein / serving"
                value={
                  nutrition.counted
                    ? `${Math.round(nutrition.perServing.protein)} g`
                    : "–"
                }
              />
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Users className="size-4" />
                </span>
                <div className="flex flex-col-reverse">
                  <dt className="text-xs text-muted-foreground">Servings</dt>
                  <dd className="flex items-center gap-1.5 font-semibold tabular-nums">
                    <button
                      type="button"
                      aria-label="Fewer servings"
                      onClick={() => setServings((s) => Math.max(1, s - 1))}
                      className="flex size-5 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground"
                    >
                      <Minus className="size-3" />
                    </button>
                    {servings}
                    <button
                      type="button"
                      aria-label="More servings"
                      onClick={() => setServings((s) => Math.min(24, s + 1))}
                      className="flex size-5 items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground"
                    >
                      <Plus className="size-3" />
                    </button>
                  </dd>
                </div>
              </div>
              <Stat
                icon={goalInfo?.icon ?? Target}
                label="Goal"
                value={goalInfo?.label ?? "Pick one"}
                muted={!goalInfo}
              />
            </dl>
          </div>

          <ChatBar
            messages={messages}
            ingredients={ingredients}
            onSend={handleChat}
          />
        </section>

        {/* Ingredient list */}
        <aside
          aria-label="Ingredients"
          className="flex min-h-0 shrink-0 flex-col xl:w-[20rem] 2xl:w-[23rem]"
        >
          <AddIngredient onAdd={(t) => addIngredients([t]).length > 0} />
          <p className="mb-3 mt-4 text-sm text-muted-foreground">
            {ingredients.length
              ? `${ingredients.length} ${ingredients.length === 1 ? "ingredient" : "ingredients"}`
              : "No ingredients yet"}
          </p>
          <ul className="flex min-h-0 flex-1 flex-col gap-3 xl:overflow-y-auto xl:pb-2 xl:pr-1">
            {ingredients.map((i) => (
              <li key={i.id}>
                <IngredientCard
                  ingredient={i}
                  onRemove={() => removeIngredient(i.id)}
                />
              </li>
            ))}
            {!ingredients.length && (
              <li className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Add anything: “200g chicken breast”, “1 cup rice”, “2 eggs”, or
                just “garlic”. You can also type “add …” in the chat.
              </li>
            )}
          </ul>
        </aside>

        {/* Nutrition facts */}
        <aside
          aria-label="Nutrition facts"
          className="flex min-h-0 shrink-0 flex-col xl:w-[19rem] 2xl:w-[21rem]"
        >
          <NutritionPanel
            nutrition={nutrition}
            servings={servings}
            hasIngredients={isSample || ingredients.length > 0}
            isSample={isSample}
          />
        </aside>
      </div>
    </div>
  );
}

// ---- Stage ---------------------------------------------------------------

function Stage({
  title,
  onTitle,
  ingredients,
}: {
  title: string;
  onTitle: (t: string) => void;
  ingredients: Ingredient[];
}) {
  const shown = ingredients.slice(0, spots.length);
  return (
    <div className="relative my-4 min-h-[20rem] flex-1">
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder="Name your dish"
        aria-label="Dish name"
        className="relative z-10 w-full max-w-[70%] bg-transparent font-display text-4xl leading-tight tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-5xl"
      />
      <div className="absolute inset-0 top-14 flex items-center justify-center">
        {/* the "plate": butter blob from the landing hero */}
        <div className="relative aspect-square h-full max-h-[30rem] max-w-full">
          <div
            aria-hidden
            className={cn(
              "absolute inset-[4%] rounded-[58%_42%_47%_53%/45%_52%_48%_55%]",
              BUTTER,
            )}
          />
          {shown.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[hsl(230_50%_16%)]">
              <span className="text-7xl" aria-hidden>
                🍽️
              </span>
              <p className="mt-3 max-w-[18ch] font-display text-2xl leading-tight">
                Add ingredients and they show up here
              </p>
            </div>
          ) : (
            shown.map((ing, idx) => {
              const spot = spots[idx];
              return (
                <div
                  key={ing.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${spot.left}%`, top: `${spot.top}%` }}
                  title={ing.name}
                >
                  {/* animation on an inner element so it doesn't fight the centering transform */}
                  <div className="duration-300 animate-in fade-in zoom-in-50">
                    <IngredientArt
                      ingredient={ing}
                      sizeRem={spot.size}
                      className="drop-shadow-[0_12px_14px_hsl(230_60%_15%/0.3)]"
                    />
                  </div>
                </div>
              );
            })
          )}
          {ingredients.length > spots.length && (
            <span className="absolute bottom-2 right-2 rounded-full bg-card px-3 py-1 text-xs">
              +{ingredients.length - spots.length} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function IngredientArt({
  ingredient,
  sizeRem,
  className,
}: {
  ingredient: IngredientInfo;
  sizeRem: number;
  className?: string;
}) {
  if (ingredient.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local cut-out PNGs, sized by the stage
      <img
        src={ingredient.image}
        alt={ingredient.name}
        style={{ width: `${sizeRem}rem`, height: `${sizeRem}rem` }}
        className={cn("object-contain", className)}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={ingredient.name}
      style={{ fontSize: `${sizeRem * 0.8}rem`, lineHeight: 1 }}
      className={cn("block select-none", className)}
    >
      {ingredient.emoji}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col-reverse">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "truncate font-semibold tabular-nums",
            muted && "font-normal text-muted-foreground",
          )}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

// ---- Ingredient list -----------------------------------------------------

function IngredientCard({
  ingredient,
  onRemove,
}: {
  ingredient: Ingredient;
  onRemove: () => void;
}) {
  return (
    <article className="relative flex h-28 overflow-hidden rounded-3xl border border-border bg-card animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex min-w-0 flex-1 flex-col justify-center p-4 pr-2">
        <h3 className="line-clamp-2 font-display text-2xl leading-[1.05] tracking-tight">
          {ingredient.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatAmount(ingredient)}
        </p>
      </div>
      <div
        className={cn(
          "relative mr-[-1.5rem] flex aspect-square h-full shrink-0 items-center justify-center rounded-full",
          BUTTER,
        )}
      >
        <IngredientArt
          ingredient={ingredient}
          sizeRem={3.5}
          className="-ml-4"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${ingredient.name}`}
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/90 backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="size-4" />
      </button>
    </article>
  );
}

function AddIngredient({ onAdd }: { onAdd: (text: string) => boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const parsed = parseIngredient(value);
  const options = useMemo(() => {
    const term = parsed?.name.toLowerCase() ?? "";
    if (!term) return [];
    return commonIngredients
      .filter((i) => i.name.toLowerCase() !== term)
      .map((i) => ({ i, score: matchScore(i.name.toLowerCase(), term) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score || a.i.name.localeCompare(b.i.name))
      .slice(0, 5)
      .map(({ i }) => ({
        text: [parsed?.amount, parsed?.unit, i.name].filter(Boolean).join(" "),
        icon: UtensilsCrossed,
        emoji: i.emoji,
      }));
  }, [parsed?.name, parsed?.amount, parsed?.unit]);

  function submit(text: string) {
    if (onAdd(text)) {
      setValue("");
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <Combobox
      value={value}
      onChange={(v) => {
        setValue(v);
        setError(false);
      }}
      onSubmit={submit}
      options={options}
      renderIcon={(o) => (
        <span className="text-lg leading-none" aria-hidden>
          {(o as (typeof options)[number]).emoji}
        </span>
      )}
      placeholder="Add an ingredient, e.g. 200g chicken"
      label="Add an ingredient"
      leading={<Plus className="size-4 text-primary" />}
      error={error ? "Type an ingredient name, e.g. “2 eggs”." : undefined}
      listPosition="below"
    />
  );
}

// ---- Chat ----------------------------------------------------------------

function ChatBar({
  messages,
  ingredients,
  onSend,
}: {
  messages: Message[];
  ingredients: Ingredient[];
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const options = useMemo(
    () => chatSuggestions(value, ingredients),
    [value, ingredients],
  );

  return (
    <div className="mx-auto mt-4 w-full max-w-3xl">
      {messages.length > 0 && (
        <ol
          ref={logRef}
          aria-live="polite"
          className="mb-2 flex max-h-32 flex-col gap-2 overflow-y-auto px-1"
        >
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <p
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-snug",
                  m.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-card",
                )}
              >
                {m.text}
              </p>
            </li>
          ))}
        </ol>
      )}
      <Combobox
        value={value}
        onChange={setValue}
        onSubmit={(t) => {
          onSend(t);
          setValue("");
        }}
        options={options}
        renderIcon={(o) => (
          <o.icon className={cn("size-4", (o as Suggestion).iconClass)} />
        )}
        placeholder="Ask anything: “make it higher protein”, “add 2 eggs”…"
        label="Chat with the recipe assistant"
        leading={<Sparkles className="size-4 text-primary" />}
        sendButton
        listPosition="above"
      />
    </div>
  );
}

function chatSuggestions(raw: string, ingredients: Ingredient[]): Suggestion[] {
  const q = raw.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const out: Suggestion[] = [];

  // "add …" or a leading amount: complete the ingredient name.
  if (/^(a|ad|add)\b/i.test(q) || /^\d/.test(q)) {
    const parsed = parseIngredient(q.replace(/^(a|ad)$/i, ""));
    const term = parsed?.name.toLowerCase() ?? "";
    const prefix = [parsed?.amount, parsed?.unit].filter(Boolean).join(" ");
    commonIngredients
      .map((i) => ({
        i,
        score: term ? matchScore(i.name.toLowerCase(), term) : 0,
      }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .forEach(({ i }) =>
        out.push({
          text: `Add ${prefix ? `${prefix} ` : ""}${i.name.toLowerCase()}`,
          icon: Plus,
          iconClass: "text-primary",
        }),
      );
  }

  // Goal prompts, plus remove/swap for ingredients already in the list.
  const actions: Suggestion[] = [
    ...goals.map((g) => ({
      text: `Make it ${g.phrase}`,
      icon: g.icon,
      iconClass: g.color,
    })),
    ...ingredients.flatMap((i) => [
      {
        text: `Swap ${i.name.toLowerCase()} for something lighter`,
        icon: WandSparkles,
        iconClass: "text-primary",
      },
      { text: `Remove ${i.name.toLowerCase()}`, icon: X },
    ]),
  ];
  const tokens = lower.split(/\s+/).filter(Boolean);
  for (const a of actions) {
    const words = a.text.toLowerCase().split(/\s+/);
    if (
      a.text.toLowerCase() !== lower &&
      tokens.every((t) => words.some((w) => w.startsWith(t)))
    )
      out.push(a);
  }

  return out.slice(0, 6);
}

// ---- Shared combobox (input + suggestion popup) ---------------------------

function Combobox<T extends { text: string; icon?: LucideIcon }>({
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
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  options: T[];
  renderIcon: (o: T) => React.ReactNode;
  placeholder: string;
  label: string;
  leading: React.ReactNode;
  sendButton?: boolean;
  error?: string;
  listPosition: "above" | "below";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const show = open && options.length > 0;

  useEffect(() => setActive(-1), [value]);

  function pick(text: string) {
    onSubmit(text);
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
      if (show && active >= 0) pick(options[active].text);
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
              key={o.text}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the input
                pick(o.text);
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
          "flex h-12 items-center gap-2 rounded-full border bg-card pl-4 pr-1.5 focus-within:border-primary",
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
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {sendButton ? (
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => pick(value)}
            aria-label="Send"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => pick(value)}
            className="h-9 shrink-0 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
          >
            Add
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 pl-4 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function matchScore(candidate: string, term: string) {
  if (candidate.startsWith(term)) return 3;
  if (candidate.split(/\s+/).some((w) => w.startsWith(term))) return 2;
  if (term.length >= 3 && candidate.includes(term)) return 1;
  return 0;
}

// ---- Nutrition facts -----------------------------------------------------

// Dummy recipe shown in the panel while the ingredient list is empty.
// Set SHOW_SAMPLE_NUTRITION to false to turn it off.
const SHOW_SAMPLE_NUTRITION = true;
const sampleIngredients = [
  { name: "Chicken breast", amount: "400", unit: "g" },
  { name: "Pasta", amount: "200", unit: "g" },
  { name: "Heavy cream", amount: "1/2", unit: "cup" },
  { name: "Parmesan", amount: "1/2", unit: "cup" },
  { name: "Butter", amount: "1", unit: "tbsp" },
  { name: "Garlic", amount: "3", unit: "clove" },
  { name: "Broccoli", amount: "2", unit: "cup" },
  { name: "Salt", amount: "", unit: "" },
];

const factRows: {
  key: keyof Nutrients;
  label: string;
  unit: "g" | "mg";
  sub?: boolean;
}[] = [
  { key: "fat", label: "Total Fat", unit: "g" },
  { key: "satFat", label: "Saturated Fat", unit: "g", sub: true },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "carbs", label: "Total Carbohydrate", unit: "g" },
  { key: "fiber", label: "Dietary Fiber", unit: "g", sub: true },
  { key: "sugar", label: "Total Sugars", unit: "g", sub: true },
  { key: "protein", label: "Protein", unit: "g" },
];

function NutritionPanel({
  nutrition,
  servings,
  hasIngredients,
  isSample,
}: {
  nutrition: RecipeNutrition;
  servings: number;
  hasIngredients: boolean;
  isSample?: boolean;
}) {
  const [scope, setScope] = useState<"serving" | "recipe">("serving");
  const n = scope === "serving" ? nutrition.perServing : nutrition.total;

  // Share of calories from each macro (4/4/9 kcal per gram).
  const macroKcal = {
    protein: n.protein * 4,
    carbs: n.carbs * 4,
    fat: n.fat * 9,
  };
  const macroSum = macroKcal.protein + macroKcal.carbs + macroKcal.fat;
  const split = [
    {
      key: "protein",
      label: "Protein",
      color: "bg-macro-protein",
      kcal: macroKcal.protein,
    },
    {
      key: "carbs",
      label: "Carbs",
      color: "bg-macro-carbs",
      kcal: macroKcal.carbs,
    },
    { key: "fat", label: "Fat", color: "bg-macro-fat", kcal: macroKcal.fat },
  ];

  return (
    <section className="surface-paper flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
        <h2 className="font-display text-4xl leading-none tracking-tight">
          Nutrition Facts
        </h2>
        {isSample && (
          <p className="mt-2 w-fit rounded-full bg-[hsl(45_84%_72%)] px-3 py-1 text-[11px] font-medium text-[hsl(230_50%_16%)]">
            Sample data: add ingredients to see yours
          </p>
        )}

        <div
          role="radiogroup"
          aria-label="Show nutrition for"
          className="mt-4 grid grid-cols-2 rounded-full bg-muted p-1 text-xs"
        >
          {(["serving", "recipe"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={scope === v}
              onClick={() => setScope(v)}
              className={cn(
                "rounded-full py-1.5 transition-colors",
                scope === v
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "serving" ? "Per serving" : "Whole recipe"}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {servings} {servings === 1 ? "serving" : "servings"} per recipe
          {hasIngredients &&
            ` · ${nutrition.counted} of ${nutrition.items.length} ingredients counted`}
        </p>

        {!hasIngredients ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Add ingredients with amounts and the full nutrition breakdown shows
            up here.
          </p>
        ) : (
          <>
            {/* Calories */}
            <div className="mt-3 flex items-end justify-between border-y-[6px] border-foreground py-2">
              <span className="text-lg font-bold">Calories</span>
              <span className="font-display text-5xl leading-none tabular-nums">
                {Math.round(n.kcal)}
              </span>
            </div>

            {/* Macro split */}
            {macroSum > 0 && (
              <div className="mt-3">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                  {split.map((m) => (
                    <div
                      key={m.key}
                      className={m.color}
                      style={{ width: `${(m.kcal / macroSum) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="mt-2 flex justify-between text-xs">
                  {split.map((m) => (
                    <li key={m.key} className="flex items-center gap-1.5">
                      <span className={cn("size-2 rounded-full", m.color)} />
                      {m.label}{" "}
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round((m.kcal / macroSum) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Label rows */}
            <dl className="mt-3 text-sm">
              <div className="flex justify-end border-b border-foreground/60 pb-1 text-[11px] font-semibold">
                % Daily Value*
              </div>
              {factRows.map((row) => {
                const value = n[row.key];
                const dv = dailyValues[row.key];
                return (
                  <div
                    key={row.key}
                    className={cn(
                      "flex items-baseline justify-between gap-2 border-b border-border py-1.5",
                      row.sub && "pl-4",
                    )}
                  >
                    <dt>
                      <span className={cn(!row.sub && "font-semibold")}>
                        {row.label}
                      </span>{" "}
                      <span className="tabular-nums">
                        {fmtNutrient(value, row.unit)}
                      </span>
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {dv ? `${Math.round((value / dv) * 100)}%` : ""}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {/* Anything we couldn't count */}
            {nutrition.skipped.length > 0 && (
              <div className="mt-4 rounded-2xl bg-[hsl(45_84%_72%/0.35)] p-3 text-xs">
                <p className="flex items-center gap-1.5 font-semibold">
                  <TriangleAlert className="size-3.5" />
                  Not counted in the totals
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {nutrition.skipped.map((i, idx) => (
                    <li key={`${i.name}-${idx}`}>
                      <span className="font-medium">{i.name}</span>: {i.issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-ingredient breakdown */}
            <details className="group mt-4 text-sm">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="underline decoration-foreground/30 underline-offset-4 group-open:decoration-foreground">
                  Breakdown by ingredient
                </span>
              </summary>
              <ul className="mt-2 flex flex-col">
                {nutrition.items.map((i, idx) => (
                  <li
                    key={`${i.name}-${idx}`}
                    className="flex items-baseline justify-between gap-2 border-b border-border py-1.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{i.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {i.grams !== null
                          ? `${Math.round(i.grams)} g`
                          : "not counted"}
                        {i.note && ` · ${i.note}`}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {i.nutrients
                        ? `${Math.round(i.nutrients.kcal)} kcal`
                        : "–"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}

        <p className="mt-auto pt-4 text-[11px] leading-snug text-muted-foreground">
          * % Daily Value is based on a 2,000-calorie diet. Estimates from USDA
          reference values for raw or dry ingredients. Not medical advice.
        </p>
      </div>
    </section>
  );
}

function fmtNutrient(value: number, unit: "g" | "mg") {
  if (unit === "mg") return `${Math.round(value)}mg`;
  if (value > 0 && value < 1) return "<1g";
  return `${Math.round(value)}g`;
}
