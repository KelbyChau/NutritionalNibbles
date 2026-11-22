"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Food = { fdc_id: number; description: string };

export function FoundationFoodPicker() {
  const supabase = useMemo(() => createClient(), []);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      const { data, error: searchError } = await supabase.rpc("search_foundation_foods", {
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
      current.some((item) => item.fdc_id === food.fdc_id) ? current : [...current, food],
    );
    setQuery("");
    setMatches([]);
    setActive(-1);
  }

  return (
    <div className="space-y-4">
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
      <p className="text-xs text-muted-foreground">Selected foods are ready to use when recipe generation is added.</p>
    </div>
  );
}
