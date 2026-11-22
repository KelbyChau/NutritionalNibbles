# NutritionalNibbles

**Keep the recipe. Change the macros.**

NutritionalNibbles helps people adapt meals they already cook to fit their
macro goals. Add a recipe's ingredients, pick a goal (more protein, fewer
calories, fewer carbs or less fat), and get practical ingredient swaps, with a
clear before-and-after comparison of what each swap does.

Built by a team of three for a 24-hour hackathon.

> Nutrition figures are estimates from USDA food data, not medical advice.

## Features

- **Recipe builder** (`/optimize`): search the USDA food list, add ingredients
  with amounts, set servings, and see calories, macros and a full nutrition
  label update as you go.
- **Optimize page** (`/optimize/chat`): choose a goal or ask for a change in
  your own words. Suggested swaps show how calories, protein, carbs and fat
  change per serving, plus a note on taste or texture. Apply, undo, or reset
  any change, then save.
- **AI swap suggestions**: Gemini proposes swaps, and every one is re-checked
  against USDA nutrition data before it is shown, so no invented numbers.
- **Dashboard** (`/dashboard`): your saved recipes, with search, sorting, and
  delete.
- **Accounts**: email sign-up and log-in. Visitors can also save as a guest
  (an anonymous Supabase account), with no sign-up needed.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) and React 19
- [Supabase](https://supabase.com): Postgres, Auth, row-level security
- [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com)
- [Motion](https://motion.dev) for animations
- Google Gemini for swap suggestions (server side)
- USDA FoodData Central (Foundation Foods and SR Legacy), loaded into the
  database by migrations

## Project structure

```
app/                  Pages and API routes
  page.tsx            Landing page
  dashboard/          Saved recipes
  optimize/           Recipe builder, and chat/ for the optimize page
  api/optimize/       Gemini swap suggestions
  auth/               Sign up, log in, password reset
components/           UI (landing/, dashboard/, optimize/, ui/ for shadcn)
lib/                  Nutrition math, USDA lookups, Supabase clients, saving
supabase/
  migrations/         Database schema, in order
  seed.sql            Demo users and recipes for local testing
  tests/              Database tests (pgTAP)
scripts/local.mjs     Runs the app against a local database
Docs/                 Project context and local-testing guide
```

## Getting started

### Requirements

- Node.js 20.9 or newer
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), for the
  local database (recommended)

### 1. Install

```bash
git clone https://github.com/KelbyChau/NutritionalNibbles.git
cd NutritionalNibbles
npm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Needed for | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everything | Supabase, Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Everything | Supabase, Project Settings → API Keys (publishable or anon key) |
| `GEMINI_API_KEY` | AI swap suggestions | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-3.5-flash-lite` |

Every line in `.env.local` must be `NAME=value` or a comment starting with
`#`; the Supabase CLI refuses to start otherwise. Never commit this file.

### 3. Run it

**Option A: local database with demo data (recommended)**

Start Docker Desktop, then:

```bash
npm run local
```

This starts a local Supabase database in Docker, applies every migration,
loads the demo data, and runs the app at
[localhost:3000](http://localhost:3000). It signs you in as the demo user
automatically. The first start downloads the Docker images and takes a few
minutes.

Demo accounts (local only), both with password `demo-password`:

- `demo@example.com`: 15 recipes
- `demo2@example.com`: 1 recipe

Local data never touches the shared Supabase project. See
[Docs/LOCAL_TESTING.md](Docs/LOCAL_TESTING.md) for more.

**Option B: against the shared Supabase project**

```bash
npm run dev
```

Uses the Supabase project in `.env.local`. It starts with no demo recipes.

### Useful commands

| Command | What it does |
|---|---|
| `npm run local` | Start the local database (if needed) and the app |
| `npm run local:reset` | Rebuild the local database from migrations and seed (deletes local data) |
| `npm run local:stop` | Stop the local database (data is kept) |
| `npm run test:db` | Run the database tests |
| `npm run dev` | Run the app against the Supabase project in `.env.local` |
| `npm run build` | Production build, the same check Vercel runs |
| `npm run lint` | Lint the code |

## License

See [LICENSE](LICENSE).
