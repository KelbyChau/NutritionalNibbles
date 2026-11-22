"""Generate lib/usda-volume-portions.json from the FoodData Central archives.

Usage: python3 scripts/usda-volume-portions.py foundation-json.zip sr-legacy-csv.zip
Source: https://fdc.nal.usda.gov/download-datasets/ (Foundation 2026-10, SR Legacy 2018-04)
"""
import csv
import io
import json
import sys
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile


units = {
    "cup": "cup", "cup (8 fl oz)": "cup", "cup (1 NLEA serving)": "cup",
    "tablespoon": "tbsp", "tbsp": "tbsp", "teaspoon": "tsp", "tsp": "tsp",
    "fl oz": "fl oz", "fluid ounce": "fl oz", "milliliter": "ml",
}
units_per_cup = {"cup": 1, "fl oz": 8, "tbsp": 16, "tsp": 48, "ml": 240}
portions = defaultdict(lambda: defaultdict(set))


def record(food_id, measure, amount, weight):
    unit = units.get(measure)
    if unit and float(amount or 0) > 0 and float(weight or 0) > 0:
        portions[int(food_id)][unit].add(round(float(weight) / float(amount), 6))


with ZipFile(sys.argv[1]) as archive:
    path = next(p for p in archive.namelist() if p.endswith(".json"))
    with archive.open(path) as source:
        for food in json.load(source)["FoundationFoods"]:
            for p in food.get("foodPortions", []):
                # A sifted or packed cup may weigh differently from a plain cup.
                if not p.get("modifier") and not p.get("portionDescription"):
                    record(food["fdcId"], p["measureUnit"]["name"], p.get("amount"), p.get("gramWeight"))

with ZipFile(sys.argv[2]) as archive:
    path = next(p for p in archive.namelist() if p.endswith("/food_portion.csv"))
    with archive.open(path) as source:
        for p in csv.DictReader(io.TextIOWrapper(source, encoding="utf-8-sig")):
            record(p["fdc_id"], p["modifier"], p["amount"], p["gram_weight"])

rows = []
for food_id, measures in sorted(portions.items()):
    if any(len(weights) != 1 for weights in measures.values()):
        continue  # Conflicting weights for the same household measure.
    weights = {unit: next(iter(values)) for unit, values in measures.items()}
    reference = next(unit for unit in units_per_cup if unit in weights)
    cup = round(weights[reference] * units_per_cup[reference], 5)
    # Keep direct spoon and ml weights too: independent USDA measures can differ by rounding.
    output = {"cup": cup, **{u: weights[u] for u in ("tbsp", "tsp", "ml") if u in weights}}
    rows.append(f'  "{food_id}": {json.dumps(output)}')

destination = Path(__file__).resolve().parents[1] / "lib" / "usda-volume-portions.json"
destination.write_text("{\n" + ",\n".join(rows) + "\n}\n", encoding="utf-8")
