"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  UtensilsCrossed,
  WandSparkles,
} from "lucide-react";
import { saveMyRecipe } from "@/lib/my-recipes";
import { calculateNutrition } from "@/lib/nutrition";
import {
  exactFood,
  foodLabel,
  foodSuggestions,
  type UsdaFood,
} from "@/lib/foundation-foods";
import { parseIngredient } from "@/lib/ingredients";
import {
  nutrients,
  promptGoals,
  type VerifiedSwap,
} from "@/lib/optimizer/nutrient-swaps";
import { cn } from "@/lib/utils";
import { BUTTER, goals, type GoalKey, type Ingredient } from "./shared";
import { Combobox } from "./combobox";
import { NutritionPanel } from "./nutrition-panel";
import { alreadyAddedMessage, ingredientWithFood, makeIngredient, useUsdaFoods } from "./ingredients";
import { loadDraft, saveDraft } from "./draft";
import {
  describeDelta,
  findSwapRule,
  scaleIngredient,
  suggestChanges,
  swapIngredient,
  type Change,
} from "./changes";
import { findIngredient, parseChatCommand } from "./chat/commands";
import { Comparison } from "./chat/comparison";
import { ActionButton, Shell } from "./chat/pieces";
import { RecipeList } from "./chat/recipe-list";
import { chatSuggestions } from "./chat/suggestions";
import {
  basisExplanation,
  basisNote,
  builtInGoal,
  describeChanges,
  formatAmount,
  lower,
} from "./chat/swap-text";
import type { Action, Message, NutrientSwapAction, Suggestion } from "./chat/types";

// The server gives up after 45 s; stop waiting a little after that.
const SWAP_REQUEST_TIMEOUT_MS = 50_000;
const TOO_SLOW = "The AI took too long to answer. Try again in a moment.";

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
    const command = parseChatCommand(text);
    if (!command) return;
    const t = text.trim();
    const notFound = (term: string) =>
      push(
        { role: "user", text: t },
        { role: "assistant", text: `I don't see “${term}” in the recipe.` },
      );

    switch (command.kind) {
      case "undo": {
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

      case "reset":
        return commit(original, t, "Back to your original recipe.");

      case "servings": {
        const s = command.servings;
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

      case "remove": {
        const hit = findIngredient(current, command.target);
        if (!hit) return notFound(command.target);
        return commit(
          current.filter((i) => i.id !== hit.id),
          t,
          `Removed ${lower(hit.name)}.`,
        );
      }

      case "swap": {
        const hit = findIngredient(current, command.target);
        if (!hit) return notFound(command.target);
        const rule = findSwapRule(hit.food.fdc_id);
        let target: UsdaFood | undefined;
        if (command.lighter) {
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
          target = exactFood(foods, command.replacement) ?? foodSuggestions(foods, command.replacement)[0];
        }
        if (!target) {
          return push(
            { role: "user", text: t },
            {
              role: "assistant",
              text: `I couldn't find “${command.replacement}” in the USDA foods list. Try a simpler name, like “Greek yogurt”.`,
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

      case "scale": {
        const hit = findIngredient(current, command.target);
        if (!hit) return notFound(command.target);
        if (command.factor <= 0)
          return commit(
            current.filter((i) => i.id !== hit.id),
            t,
            `Removed ${lower(hit.name)}.`,
          );
        return commit(
          scaleIngredient(current, hit.id, command.factor),
          t,
          `Changed ${lower(hit.name)}.`,
        );
      }

      case "setAmount": {
        const hit = findIngredient(current, command.target);
        if (!hit) return notFound(command.target);
        const unit = command.unit ?? hit.unit;
        return commit(
          current.map((i) =>
            i.id === hit.id ? { ...i, amount: command.amount, unit } : i,
          ),
          t,
          `${hit.name} is now ${command.amount} ${unit}.`,
        );
      }

      case "add": {
        const parsed = parseIngredient(command.text);
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
        const existing = ingredientWithFood(current, food);
        if (existing) {
          return push(
            { role: "user", text: t },
            {
              role: "assistant",
              text: `${alreadyAddedMessage(existing)} For example: “change ${lower(existing.name)} to 200 g”.`,
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
            className="flex size-20 items-center justify-center rounded-full bg-muted"
          >
            <UtensilsCrossed className="size-9 text-foreground" />
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
                        "mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-primary",
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
                      "mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-primary",
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
          <RecipeList
            current={current}
            original={original}
            servings={servings}
            canUndo={history.length > 0}
            onCommand={handle}
          />
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

// ---- Helpers -----------------------------------------------------------------

function refreshDraftFoods(ingredients: Ingredient[], byId: Map<number, UsdaFood>) {
  return byId.size ? ingredients.map((ingredient) => {
    const food = byId.get(ingredient.food.fdc_id);
    return food ? { ...ingredient, food } : ingredient;
  }) : ingredients;
}
