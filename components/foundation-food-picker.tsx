"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const nutrients = [
  ["kcal_per_100g", "Calories", "kcal"],
  ["protein_per_100g", "Protein", "g"],
  ["carbs_per_100g", "Carbs", "g"],
  ["fat_per_100g", "Fat", "g"],
] as const;
type Food = { fdc_id: number; description: string } &
  Record<(typeof nutrients)[number][0], number | null>;
type Ingredient = Food & { grams: string };

export function FoundationFoodPicker() {
  const supabase = useMemo(() => createClient(), []);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Ingredient[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const validServings = Number.isInteger(Number(servings)) && Number(servings) > 0;
  const validWeights = selected.length > 0 && selected.every(food => Number(food.grams) > 0);

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNotice("Sign in to save your recipe.");
        return;
      }
      const { error } = await supabase.rpc("save_foundation_recipe", {
        recipe_title: title.trim(), serving_count: Number(servings),
        items: selected.map(food => ({ fdc_id: food.fdc_id, amount: Number(food.grams) })),
      });
      setNotice(error ? "Couldn’t save your recipe. Please try again." : "Recipe saved to your account.");
    } catch {
      setNotice("Couldn’t connect. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      const { data, error: searchError } = await supabase.rpc("search_foundation_ingredients", {
        search_text: term,
      });
      if (cancelled) return;
      setLoading(false);
      if (searchError) {
        setMatches([]);
        setError("Couldn’t load food suggestions. Please try again.");
      } else {
        setMatches((data ?? []) as Food[]);
        setActive(-1);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, supabase]);

  function choose(food: Food) {
    setSelected((current) =>
      current.some((item) => item.fdc_id === food.fdc_id) ? current : [...current, { ...food, grams: "100" }],
    );
    setQuery("");
    setMatches([]);
    setActive(-1);
  }

  return (
    <fieldset disabled={saving} className="space-y-4">
      <label className="block">Recipe name
        <input className="block w-full rounded border p-2" value={title} onChange={e => setTitle(e.target.value)} />
      </label>
      <div className="relative">
        <label htmlFor="foundation-food-search" className="mb-2 block font-medium">
          Ingredients you have
        </label>
        <input
          id="foundation-food-search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={query.trim().length >= 2 && matches.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setMatches([]);
            setError("");
            setActive(-1);
            if (value.trim().length < 2) setLoading(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && matches.length) {
              event.preventDefault();
              setActive((index) => (index + 1) % matches.length);
            } else if (event.key === "ArrowUp" && matches.length) {
              event.preventDefault();
              setActive((index) => (index <= 0 ? matches.length - 1 : index - 1));
            } else if (event.key === "Enter" && active >= 0) {
              event.preventDefault();
              choose(matches[active]);
            } else if (event.key === "Escape") {
              setMatches([]);
              setActive(-1);
            }
          }}
          placeholder="Search Foundation Foods, e.g. tomato"
          autoComplete="off"
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {matches.length > 0 && (
          <ul id={listId} role="listbox" className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg">
            {matches.map((food, index) => (
              <li key={food.fdc_id} id={`${listId}-${index}`} role="option" aria-selected={active === index}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(food)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? "bg-secondary" : ""}`}
                >
                  {food.description}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {error || (loading ? "Searching foods…" : query.trim().length < 2 ? "Type at least 2 characters." : matches.length === 0 ? "No matching Foundation Foods." : `${matches.length} suggestions available.`)}
      </p>
      {selected.length > 0 && (
        <div aria-label="Selected ingredients" className="flex flex-wrap gap-2">
          {selected.map((food) => (
            <span key={food.fdc_id} className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm">
              {food.description}
              <label>Grams
                <input type="number" min="0" step="any" aria-label={food.description + " grams"}
                  className="w-24 rounded border p-1" value={food.grams}
                  onChange={e => setSelected(items => items.map(item => item.fdc_id === food.fdc_id
                    ? { ...item, grams: e.target.value } : item))} />
              </label>
              <button
                type="button"
                aria-label={`Remove ${food.description}`}
                onClick={() => setSelected((items) => items.filter((item) => item.fdc_id !== food.fdc_id))}
                className="rounded-full px-1 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <label className="block">Servings
        <input className="ml-2 w-20 rounded border p-1" type="number" min="1" step="1"
          value={servings} onChange={e => setServings(e.target.value)} />
      </label>
      <section aria-label="Estimated nutrition">
        <h2 className="font-medium">Estimated nutrition</h2>
        <table className="w-full text-left text-sm">
          <thead><tr><th>Nutrient</th><th>Whole recipe</th><th>Per serving</th></tr></thead>
          <tbody>{nutrients.map(([key, label, unit]) => {
            const known = validWeights && selected.every(food => food[key] != null);
            const total = selected.reduce((sum, food) => sum + (food[key] ?? 0) * Number(food.grams) / 100, 0);
            return <tr key={key}><th scope="row">{label}</th>
              <td>{known ? total.toFixed(1) + " " + unit : "—"}</td>
              <td>{known && validServings ? (total / Number(servings)).toFixed(1) + " " + unit : "—"}</td></tr>;
          })}</tbody>
        </table>
        {selected.some(food => nutrients.some(([key]) => food[key] == null)) &&
          <p className="text-sm">A dash marks an estimate with missing USDA data.</p>}
      </section>
      <button type="button" disabled={!validServings || !validWeights || !title.trim() || saving}
        className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" onClick={save}>
        {saving ? "Saving…" : "Save recipe"}
      </button>
      <p role="status">{notice}</p>
    </fieldset>
  );
}
