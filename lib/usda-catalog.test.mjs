// The USDA food list is loaded once per browser tab and shared by the
// builder and the chat. These use a fake Supabase client that records calls.
import assert from "node:assert/strict";
import test from "node:test";
import { loadUsdaCatalog, resetUsdaCatalog, USDA_FOOD_COLUMNS } from "./usda-catalog.ts";

function fakeClient({ failFirst = false } = {}) {
  const calls = [];
  let failures = failFirst ? 1 : 0;
  const client = {
    from(table) {
      const call = { table };
      calls.push(call);
      const query = {
        select(columns, options) { call.columns = columns; call.options = options; return query; },
        order() { return query; },
        range(from, to) { call.range = [from, to]; return query; },
        then(resolve) {
          if (table === "foundation_foods" && failures > 0) { failures--; return resolve({ error: { message: "down" } }); }
          if (table === "foundation_foods")
            return resolve({ data: [{ fdc_id: 1, description: "Apples, raw" }, { fdc_id: 2, description: "Eggs, raw" }] });
          if (call.options?.head) return resolve({ count: 1500 });
          const rows = call.range[0] === 0
            ? [{ fdc_id: 10, description: "Syrups, maple" }]
            : [{ fdc_id: 11, description: "Butter, salted" }];
          return resolve({ data: rows });
        },
      };
      return query;
    },
  };
  return { client, calls };
}

test.beforeEach(() => resetUsdaCatalog());

test("loads Foundation foods, then SR Legacy pages, tagged by catalog", async () => {
  const { client } = fakeClient();
  const foods = await loadUsdaCatalog(client);
  assert.deepEqual(foods.map((f) => [f.fdc_id, f.source]),
    [[1, "foundation"], [2, "foundation"], [10, "sr_legacy"], [11, "sr_legacy"]]);
});

test("fetches once, however many pages ask", async () => {
  const { client, calls } = fakeClient();
  const [a, b] = await Promise.all([loadUsdaCatalog(client), loadUsdaCatalog(client)]);
  await loadUsdaCatalog(client);
  assert.equal(a, b);
  assert.equal(calls.length, 4); // foundation + count + 2 legacy pages of 1000
});

test("asks only for the columns the app uses", async () => {
  const { client, calls } = fakeClient();
  await loadUsdaCatalog(client);
  for (const call of calls) {
    if (call.options?.head) assert.deepEqual([call.columns, call.options], ["fdc_id", { count: "exact", head: true }]);
    else assert.equal(call.columns, USDA_FOOD_COLUMNS);
  }
  assert.equal(USDA_FOOD_COLUMNS,
    "fdc_id, description, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, total_sugars_g_per_100g, sodium_mg_per_100g");
});

test("retries after a failure", async () => {
  const { client } = fakeClient({ failFirst: true });
  await assert.rejects(loadUsdaCatalog(client), /Catalog unavailable/);
  const foods = await loadUsdaCatalog(client);
  assert.equal(foods.length, 4);
});
