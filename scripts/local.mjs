// Local testing: runs the app against a local Supabase stack in Docker,
// seeded with demo recipes from supabase/seed.sql. See Docs/LOCAL_TESTING.md.
//
//   npm run local          start the local database (if needed), reset it to
//                          the migrations and demo data, then start the app
//   npm run local -- --keep  the same, but keep the data from last time
//   npm run local:reset    wipe the local database, re-run migrations and seed
//   npm run local:stop     stop the local database (its data is kept)
//   npm run test:db        run the database tests in supabase/tests
//
// Arguments after `npm run local --` go to `next dev`, e.g. `-- -p 3001`.
import { spawn, spawnSync } from "node:child_process";

// Everyone uses the same CLI version: supabase/config.toml was written by it.
const SUPABASE = ["--yes", "supabase@3.2.0"];
const onWindows = process.platform === "win32"; // npx is npx.cmd there

const [first, ...rest] = process.argv.slice(2);
const command = !first || first.startsWith("-") ? "start" : first;
const args = command === "start" ? process.argv.slice(2) : rest;
// --keep is ours; every other argument goes to `next dev`.
const keepData = args.includes("--keep");
const nextArgs = args.filter((arg) => arg !== "--keep");

function supabase(args, options = {}) {
  return spawnSync("npx", [...SUPABASE, ...args], {
    stdio: "inherit",
    shell: onWindows,
    ...options,
  });
}

function requireDocker() {
  const docker = spawnSync("docker", ["info"], { stdio: "ignore", shell: onWindows });
  if (docker.status !== 0) {
    console.error("Docker isn't running (or isn't installed). Start Docker Desktop, then try again.");
    process.exit(1);
  }
}

function exitOnFailure(result) {
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The local stack's URLs and keys, or null when it isn't running.
function localStatus() {
  const result = supabase(["status", "-o", "json"], { stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout.toString());
  } catch {
    return null;
  }
}

// Starts the local stack if it isn't running and returns its status.
function ensureStarted() {
  requireDocker();
  let status = localStatus();
  if (!status) {
    // The first start downloads the Docker images (a few minutes), applies
    // supabase/migrations and loads supabase/seed.sql. Later starts keep the data.
    exitOnFailure(supabase(["start"]));
    status = localStatus();
  }
  if (!status) {
    console.error("The local database didn't start. Run `npx supabase@3.2.0 status` to see why.");
    process.exit(1);
  }
  return status;
}

function startApp() {
  let status = ensureStarted();
  if (!keepData) {
    // Every run starts from the same data: all migrations, then the demo data
    // in supabase/seed.sql. Recipes, sign-ups and guests from last time go.
    console.log("Resetting the local database (pass --keep to keep last run's data)…");
    exitOnFailure(supabase(["db", "reset"]));
    status = localStatus() ?? status;
  }
  const url = status.API_URL;
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  if (!url || !key) {
    console.error("`supabase status` didn't include the API URL and key.");
    process.exit(1);
  }

  console.log(`
Local database is running in Docker.
  Studio (browse the data): ${status.STUDIO_URL ?? "http://127.0.0.1:54323"}
  Demo sign-in:             demo@example.com / demo-password  (or demo2@example.com)
                            You're signed in as demo@example.com automatically.
Starting the app against it…
`);

  // process.env wins over .env.local, so only these two values change.
  const app = spawn("npx", ["next", "dev", ...nextArgs], {
    stdio: "inherit",
    shell: onWindows,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      // Sign every visitor in as the first seeded demo account (see
      // lib/supabase/proxy.ts). Local database only.
      LOCAL_DEMO_EMAIL: "demo@example.com",
      LOCAL_DEMO_PASSWORD: "demo-password",
    },
  });
  // Ctrl+C reaches next dev directly; exit once it has shut down.
  process.on("SIGINT", () => {});
  app.on("exit", (code) => process.exit(code ?? 0));
}

switch (command) {
  case "start":
    startApp();
    break;
  case "reset":
    ensureStarted();
    exitOnFailure(supabase(["db", "reset"]));
    break;
  case "stop":
    exitOnFailure(supabase(["stop"]));
    break;
  case "test":
    ensureStarted();
    exitOnFailure(supabase(["test", "db"]));
    break;
  default:
    console.error(`Unknown command "${command}". Use start, reset, stop or test.`);
    process.exit(1);
}
