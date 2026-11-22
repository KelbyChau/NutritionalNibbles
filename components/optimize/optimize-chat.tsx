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
import { calculateNutrition, type Nutrients, type RecipeNutrition } from "@/lib/nutrition";
import {
  exactFood,
  foodLabel,
  foodSuggestions,
  type FoundationFood,
} from "@/lib/foundation-foods";
import { parseIngredient } from "@/lib/ingredients";
import {
  nutrients,
  promptGoals,
  type NutrientChange,
  type SwapBasis,
  type Direction,
  type Goal,
  type Target,
  type VerifiedSwap,
} from "@/lib/optimizer/nutrient-swaps";
import { cn } from "@/lib/utils";
import {
  BUTTER,
  Combobox,
  IngredientArt,
  AnimatedNumber,
  fmtCount,
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
  | { type: "goal"; goal: GoalKey }
  | { type: "change"; change: Change }
  | { type: "nutrientSwap"; swap: VerifiedSwap; from: Ingredient; servings: number; label: string };
type NutrientSwapAction = Extract<Action, { type: "nutrientSwap" }>;

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
const formatAmount = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

function formatChange({ target, perServing }: NutrientChange) {
  const { label, unit } = nutrients[target];
  const size = Math.abs(perServing);
  const value = unit === "g" ? formatAmount.format(size) : String(Math.round(size));
  const sign = perServing > 0 ? "+" : "−";
  return target === "calories" ? `${sign}${value} kcal` : `${sign}${value} ${unit} ${label}`;
}

// "+5.11 g protein, −163 kcal per serving (also −20.96 g fat)". A requested
// nutrient that barely moved is called out rather than left out.
function describeChanges(swap: VerifiedSwap) {
  const requested = swap.changes.map((c) =>
    Math.abs(c.perServing) < nutrients[c.target].minChange
      ? `about the same ${nutrients[c.target].label}`
      : formatChange(c),
  );
  const also = swap.sideEffects.map(formatChange);
  return `${requested.join(", ")} per serving` + (also.length ? ` (also ${also.join(", ")})` : "");
}

const basisNote: Record<SwapBasis, string> = {
  same_weight: "",
  same_volume: ", about the same volume",
  prepared_equivalent: ", the ready-to-eat equivalent",
};

// Shown under each offered swap, so the amount is never a surprise.
const basisExplanation: Record<SwapBasis, string> = {
  same_weight: "Same weight as the original.",
  same_volume: "About the same volume as the original, so the weight differs.",
  prepared_equivalent: "The ready-to-eat equivalent of the original amount (one is dry, the other isn't).",
};

const isGoalKey = (t: Target): t is GoalKey => goals.some((g) => g.key === t);

// The server gives up after 45 s; stop waiting a little after that.
const SWAP_REQUEST_TIMEOUT_MS = 50_000;
const TOO_SLOW = "The AI took too long to answer. Try again in a moment.";

// The built-in (rule-based) goals each go one way, so they only stand in for
// the AI when the user asked for that same direction.
const builtInDirection: Record<GoalKey, Direction> = { protein: "higher", calories: "lower", carbs: "lower", fat: "lower" };
function builtInGoal(asked: Goal[]): GoalKey | undefined {
  const match = asked.find(({ target, direction }) => isGoalKey(target) && builtInDirection[target] === direction);
  return match && isGoalKey(match.target) ? match.target : undefined;
}

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
  const [originalDraft, setOriginal] = useState<Ingredient[]>([]);
  const [currentDraft, setCurrent] = useState<Ingredient[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Ingredient[][]>([]);
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [checkingSwaps, setCheckingSwaps] = useState(false);
  const pendingSwap = useRef<AbortController | null>(null);
  const recipeRevision = useRef(0);
  const nextId = useRef(1);
  const logEnd = useRef<HTMLDivElement>(null);

  const catalogById = useMemo(() => new Map(foods.map((food) => [food.fdc_id, food])), [foods]);
  const original = useMemo(() => refreshDraftFoods(originalDraft, catalogById), [originalDraft, catalogById]);
  const current = useMemo(
    () => currentDraft === originalDraft || currentDraft === original
      ? original
      : refreshDraftFoods(currentDraft, catalogById),
    [currentDraft, originalDraft, original, catalogById],
  );

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
          "What do you want to optimize? Pick a goal or ask for a change, like “more protein and fewer calories”, “make this lower in sodium” or “swap heavy cream for Greek yogurt”.",
        actions: goals.map((g) => ({ type: "goal", goal: g.key })),
      },
    ]);
  }, []);

  // Keep the draft up to date so a refresh or "Edit ingredients" keeps changes.
  useEffect(() => {
    if (!loaded || !original.length) return;
    saveDraft({ title, servings, original, current, savedId });
  }, [loaded, title, servings, original, current, savedId]);

  async function save() {
    const id = await saveMyRecipe({
      replaceId: savedId,
      title,
      servings,
      ingredients: current,
    });
    setSavedId(id);
  }

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, checkingSwaps]);

  useEffect(() => () => pendingSwap.current?.abort(), []);

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
    recordIngredientChange(next);
    push(
      { role: "user", text: user },
      { role: "assistant", text: `${what}\n${describeDelta(prev, after)}.` },
    );
  }

  function recordIngredientChange(next: Ingredient[]) {
    recipeRevision.current++;
    setHistory((h) => [...h, current]);
    setCurrent(next);
  }

  function prepareNutrientSwap({ swap, from }: NutrientSwapAction) {
    const replacement = makeIngredient(swap.replacement, { amount: String(swap.grams), unit: "g" }, from.id);
    const fromAmount = [from.amount, from.unit].filter(Boolean).join(" ");
    return {
      ingredients: current.map((i) => i.id === from.id ? replacement : i),
      message:
        `Swapped ${fromAmount} ${lower(from.name)} for ${formatAmount.format(swap.grams)} g ` +
        `${lower(replacement.name)}${basisNote[swap.basis]}. Estimated ${describeChanges(swap)}.`,
    };
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

  // echoUser: false when the user's message is already in the chat (the AI
  // path posts it first and falls back here). note is shown before the goal.
  function suggestFor(
    g: GoalKey,
    user: string,
    list = current,
    { echoUser = true, note = "" } = {},
  ) {
    const info = goals.find((x) => x.key === g)!;
    const changes = suggestChanges(g, list, servings, foods);
    const userMessage: Omit<Message, "id">[] = echoUser ? [{ role: "user", text: user }] : [];
    const intro = note ? `${note}\n\n` : "";
    if (catalogStatus) {
      return push(
        ...userMessage,
        {
          role: "assistant",
          text: `${intro}Goal set: ${info.phrase}. ${catalogStatus} Try again in a moment.`,
        },
      );
    }
    const perNow = calculateNutrition(list, servings).perServing;
    push(
      ...userMessage,
      changes.length
        ? {
            role: "assistant",
            text:
              `${intro}Goal: ${info.phrase}. Here are the changes that help most:\n\n` +
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
              `${intro}Goal: ${info.phrase}. I don't have a swap that improves this for your current ingredients. ` +
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

  async function suggestNutrientSwaps(prompt: string) {
    if (pendingSwap.current) return;
    const controller = new AbortController();
    const revision = recipeRevision.current;
    pendingSwap.current = controller;
    setCheckingSwaps(true);
    push({ role: "user", text: prompt });
    try {
      const response = await fetch("/api/optimize/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(SWAP_REQUEST_TIMEOUT_MS)]),
        body: JSON.stringify({
          prompt, title, servings,
          ingredients: current.map(({ id, food, amount, unit }) => ({
            id, fdcId: food.fdc_id, amount, unit,
          })),
        }),
      });
      const result: { swaps?: VerifiedSwap[]; message?: string; error?: string } = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        // Signed out (401), AI failing (502), no AI key (503) or too slow
        // (504): macro goals still get the built-in swaps.
        const goalTarget = builtInGoal(promptGoals(prompt));
        if (goalTarget && [401, 502, 503, 504].includes(response.status)) {
          suggestFor(goalTarget, prompt, current, {
            echoUser: false,
            note: `${result.error ?? "AI suggestions aren’t available right now."} Here are the built-in swaps instead.`,
          });
          return;
        }
        push({ role: "assistant", text: result.error ?? "I couldn’t check swaps right now. Try again in a moment." });
        return;
      }
      if (revision !== recipeRevision.current) {
        push({ role: "assistant", text: "Your recipe changed while I was checking swaps. Ask again to optimize the current version." });
        return;
      }
      const actions: NutrientSwapAction[] = (result.swaps ?? []).flatMap((swap) => {
        const from = current.find((item) => item.id === swap.ingredientId);
        if (!from) return [];
        const label = `${from.name} → ${foodLabel(swap.replacement.description)} (${formatAmount.format(swap.grams)} g)`;
        return [{ type: "nutrientSwap", swap, from, servings, label }];
      });
      const asked = promptGoals(prompt);
      const goalTarget = builtInGoal(asked);
      if (!actions.length && goalTarget) {
        // No verified AI swap: the curated swaps may still have one for this goal.
        suggestFor(goalTarget, prompt, current, {
          echoUser: false,
          note: result.message ?? "The AI didn’t find a verified swap for this recipe, so here are the built-in ones.",
        });
        return;
      }
      if (!actions.length) {
        push({
          role: "assistant",
          text: result.message ?? "I couldn’t verify a suitable swap for this recipe using the USDA catalog.",
        });
        return;
      }
      // Offer the swaps; nothing changes until the user taps one.
      const goalText = asked
        .map(({ target, direction }) => `${direction === "higher" ? "higher" : "lower"} ${nutrients[target].label}`)
        .join(", ");
      push({
        role: "assistant",
        text:
          `Goal: ${goalText}. Pick the swap that suits your dish best; each is checked against USDA data:\n\n` +
          actions
            .map(({ label, swap }, i) =>
              `${i + 1}. ${label}: ${describeChanges(swap)}.\n   ` +
              [swap.note, basisExplanation[swap.basis]].filter(Boolean).join(" "))
            .join("\n") +
          "\n\nTap one to apply it, or tell me something else to change.",
        actions,
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        const timedOut = error instanceof DOMException && error.name === "TimeoutError";
        const goalTarget = builtInGoal(promptGoals(prompt));
        if (goalTarget) {
          suggestFor(goalTarget, prompt, current, {
            echoUser: false,
            note: `${timedOut ? TOO_SLOW : "I couldn’t check AI swaps right now."} Here are the built-in swaps instead.`,
          });
        } else {
          push({ role: "assistant", text: timedOut ? TOO_SLOW : "I couldn’t check swaps right now. Try again in a moment." });
        }
      }
    } finally {
      pendingSwap.current = null;
      setCheckingSwaps(false);
    }
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
      recipeRevision.current++;
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
      if (s !== servings) recipeRevision.current++;
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

    const asked = promptGoals(t);
    if (asked.length) {
      const goalTarget = builtInGoal(asked);
      if (goalTarget) setGoal(goalTarget);
      return void suggestNutrientSwaps(t);
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
          "• any nutrient, either way: “more carbs”, “less protein”, “more calories”\n" +
          "• several goals at once: “more protein and fewer calories”\n" +
          "• “swap heavy cream for Greek yogurt” or “swap rice for something lighter”\n" +
          "• “use half the butter”, “use 25% less pasta”, “change chicken to 300 g”\n" +
          "• “remove garlic”, “add 100 g spinach”, “4 servings”, “undo”, “reset”\n" +
          "• “make this recipe lower in sugar” or “reduce the sodium”",
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
    } else if (a.type === "change") {
      applyChange(a.change);
    } else {
      const item = current.find((i) => i.id === a.from.id);
      if (!item || item.food.fdc_id !== a.from.food.fdc_id || item.amount !== a.from.amount ||
          item.unit !== a.from.unit || servings !== a.servings) {
        push({ role: "assistant", text: "The ingredient or serving count changed. Ask for a new suggestion to verify the reduction." });
        return;
      }
      const applied = prepareNutrientSwap(a);
      commit(applied.ingredients, `Apply: ${a.label}`, applied.message);
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
          <span
            aria-hidden
            className="flex size-20 items-center justify-center rounded-full bg-[hsl(45_84%_72%)]"
          >
            <UtensilsCrossed className="size-9 text-[hsl(230_50%_16%)]" />
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
              {checkingSwaps && (
                <li className="flex justify-start gap-3">
                  <span
                    className={cn(
                      "mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[hsl(229_73%_48%)]",
                      BUTTER,
                    )}
                  >
                    <WandSparkles className="size-4" />
                  </span>
                  <div className="surface-paper flex max-w-[85%] items-center gap-3 rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm leading-relaxed">
                    <span className="flex gap-1" aria-hidden>
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="size-1.5 animate-bounce rounded-full bg-primary"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                    <span>Finding swaps that fit your goal and checking them against USDA data. This can take up to half a minute.</span>
                  </div>
                </li>
              )}
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
              placeholder="Tell me what to change: “reduce the sodium”, “swap butter for…”"
              label="Tell the optimizer what to change"
              leading={<Sparkles className="size-4 text-primary" />}
              sendButton
              size="lg"
              listPosition="above"
            />
            <p role="status" className="mt-2 text-center text-[11px] text-muted-foreground">
              {checkingSwaps ? "Checking USDA swaps…" : "Nutrition is estimated from USDA values. Not medical advice."}
            </p>
          </div>
        </section>

        {/* Recipe + comparison */}
        <aside
          aria-label="Your recipe"
          className="flex min-h-0 shrink-0 flex-col gap-4 xl:w-[21rem]"
        >
          <Comparison
            before={before}
            now={now}
            servings={servings}
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
                <AnimatedNumber value={servings} format={fmtCount} />
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
      Apply: {action.type === "nutrientSwap" ? action.label : action.change.label}
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

function refreshDraftFoods(ingredients: Ingredient[], byId: Map<number, FoundationFood>) {
  return byId.size ? ingredients.map((ingredient) => {
    const food = byId.get(ingredient.food.fdc_id);
    return food ? { ...ingredient, food } : ingredient;
  }) : ingredients;
}

function perServingComparison(nutrition: RecipeNutrition, key: keyof Nutrients, servings: number) {
  let total = 0;
  let counted = 0;
  for (const item of nutrition.items) {
    const value = item.nutrients?.[key];
    if (value == null) continue;
    total += value;
    counted++;
  }
  return {
    value: counted || !nutrition.items.length ? total / servings : null,
    partial: counted > 0 && counted < nutrition.items.length,
  };
}

function Comparison({
  before,
  now,
  servings,
  goal,
}: {
  before: RecipeNutrition;
  now: RecipeNutrition;
  servings: number;
  goal: GoalKey | null;
}) {
  const rows: {
    key: keyof Nutrients;
    label: string;
    unit: string;
    goal?: GoalKey;
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
    { key: "sugar", label: "Total sugars", unit: " g", better: "down" },
    { key: "sodium", label: "Sodium", unit: " mg", better: "down" },
  ];
  const comparison = rows.map((row) => ({
    ...row,
    before: perServingComparison(before, row.key, servings),
    now: perServingComparison(now, row.key, servings),
  }));
  return (
    <section className="surface-paper rounded-3xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl leading-none">Before → Now</h2>
        <span className="text-[11px] text-muted-foreground">per serving</span>
      </div>
      <dl className="mt-3 flex flex-col">
        {comparison.map((r) => {
          const a = r.before.value;
          const b = r.now.value;
          const wholeNumber = r.key === "kcal" || r.key === "sodium";
          const display = (value: number) => formatAmount.format(wholeNumber ? Math.round(value) : value);
          const d = a === null || b === null || r.before.partial || r.now.partial ? null : b - a;
          const threshold = wholeNumber ? 0.5 : 0.005;
          const good =
            d !== null &&
            Math.abs(d) >= threshold &&
            (r.better === "up" ? d > 0 : d < 0);
          const bad = d !== null && Math.abs(d) >= threshold && !good;
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
                <AnimatedNumber value={a} format={(v) => (v === null ? "—" : display(v))} />
                {r.before.partial && <sup>†</sup>} →{" "}
                <span className="text-foreground">
                  <AnimatedNumber value={b} format={(v) => (v === null ? "—" : display(v))} />
                  {r.now.partial && <sup>†</sup>}
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
                {d === null ? (
                  ""
                ) : Math.abs(d) < threshold ? (
                  "same"
                ) : (
                  <AnimatedNumber
                    value={d}
                    format={(v) => (v === null ? "" : `${v > 0 ? "+" : "−"}${display(Math.abs(v))}`)}
                  />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {comparison.some((row) => row.before.partial || row.now.partial) && (
        <p className="mt-2 text-xs text-muted-foreground">
          † Subtotal. Some ingredients lack data for that nutrient.
        </p>
      )}
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
