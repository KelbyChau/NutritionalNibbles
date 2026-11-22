# Local testing

Run the whole app on your machine against a local Supabase database in Docker,
filled with demo recipes. Nothing you do locally touches the shared Supabase project.

## Keeping the local and shared databases in sync

The local database is built only from the migration files in `supabase/migrations`,
plus the demo data in `supabase/seed.sql`. A change made directly on the shared
project (in the Supabase dashboard, its SQL editor, or by an AI agent running SQL)
never reaches anyone's local database or the repo.

**To change the schema**, such as adding a table or a column, make it a migration so
both databases get the same change:

1. Create a migration file, then write the SQL in it:
   ```sh
   npx supabase@3.2.0 migration new add_meal_plans
   ```
2. Apply it locally:
   - `npx supabase@3.2.0 migration up` applies new migrations and keeps your local data.
   - `npm run local:reset` starts from scratch: every migration, then the demo data.
3. Run `npm run test:db`, then commit the migration together with the code that uses
   it. Teammates pick it up with `git pull`, then `npm run local` (which resets) or `npm run local:reset`.
4. Apply the same file to the shared project with
   `npx supabase@3.2.0 db push --remote`. Without `--remote` it targets your local
   database and just reports "Local database is up to date". Add `--dry-run` first to
   see which migrations it would apply. It records each migration under its file's
   version, so the shared project's history keeps matching the repo. The first time,
   run `npx supabase@3.2.0 login`, then
   `npx supabase@3.2.0 link --project-ref qmvzxgywdibvdburlanw`, which asks for the
   database password. Have one person do this, so a migration isn't applied twice.

Running the SQL some other way, such as in the dashboard's SQL editor or with the
Supabase MCP `apply_migration` tool (which picks its own version number), leaves the
shared project's history out of step with the repo, and `db push` will then complain
about versions it doesn't recognize.

**If someone changes the shared project directly anyway**, capture the change as a
migration afterwards. Either write one that repeats the change, or generate one from
the shared project's schema with `npx supabase@3.2.0 db pull --remote` (this also
needs the project linked). Commit it, then run `npm run local:reset`.

**Rows don't copy down.** Only the table structure travels through migrations.
Recipes and users created on the shared project stay there, and locally you have the
demo data. Foundation Foods is in both because a migration loads it.

> **Known difference today:** the shared project's saves table was renamed to
> `saved_recipes_history` without a migration. The migrations, the code and the tests
> still use `saved_recipes`, so saving recipes works locally but fails on the shared
> project. Delete this note once a migration settles the name.

## Requirements

- Docker Desktop, running
- Node.js 20.9 or newer, and `npm install` done

You don't need to install the Supabase CLI: the scripts run a pinned version
(3.2.0) through `npx`.

## Run it

```sh
npm run local
```

1. The first run downloads the Docker images (a few minutes), builds the database
   from `supabase/migrations`, and loads the demo data from `supabase/seed.sql`.
2. Every run then resets the database: all the migrations again, then the demo data.
   Recipes you saved, accounts you signed up and guests from the last run are gone.
   To keep them, run `npm run local -- --keep`.
3. It then starts the app at http://localhost:3000, pointed at that database.
   Your `.env.local` isn't changed; only the two Supabase settings are overridden
   for this run.

Ctrl+C stops the app. The database keeps running in the background until you stop it.
If port 3000 is taken, pass a different one: `npm run local -- -p 3001`.

## Demo accounts

Sign in at http://localhost:3000/auth/login. New sign-ups also work locally, with
no confirmation email.

| Email | Password | Has |
|---|---|---|
| `demo@example.com` | `demo-password` | 3 private recipes and 2 saved recipes |
| `demo2@example.com` | `demo-password` | 1 private recipe, which `demo@example.com` must not see |

## What's seeded

- **12 public recipes** covering a range of dishes. They include quick,
  high-protein and lighter recipes, so every dashboard category has something in it.
- **Creamy Chicken Alfredo** and **Lighter Chicken Alfredo**: an original and an
  optimized version, linked by `parent_recipe_id`, for before-and-after work.
- **Garlic Butter Shrimp**: butter has no calorie, protein or carb data in USDA
  Foundation Foods, so only fat is calculated. Use it to check how the UI shows
  missing macros.

Every seeded recipe is created with `save_foundation_recipe()`, the same function the
app saves with. Ingredients are Foundation Foods ids with weights in grams, and the
database calculates the macros, so none of the numbers are hand-written. To add a
recipe, copy an entry in `supabase/seed.sql`, then run `npm run local:reset`.

## Commands

| Command | What it does |
|---|---|
| `npm run local` | Start the database if needed, reset it to the migrations and demo data, then start the app |
| `npm run local -- --keep` | The same, without the reset: keeps the last run's data |
| `npm run local:reset` | Wipe the local database, re-apply the migrations and reload the demo data, without starting the app |
| `npm run local:stop` | Stop the database. Its data is kept for next time. |
| `npm run test:db` | Run the database tests in `supabase/tests` |

While the database is running you also have:

- **Studio**, to browse and edit data or run SQL: http://127.0.0.1:54323
- **Mailpit**, which catches the emails auth would send: http://127.0.0.1:54324

## Good to know

- **Only the services the app uses run locally.** Realtime, storage, edge functions and
  analytics are turned off in `supabase/config.toml`.
- **`supabase/seed.sql` is for local data only.** Never run it against the shared project.
- **"Docker isn't running"** means Docker Desktop needs to be started first.
