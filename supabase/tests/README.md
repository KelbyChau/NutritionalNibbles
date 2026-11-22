# Local database tests

Requires Docker. From the repository root:

```sh
npm run test:db
```

This starts the local database if it isn't running (see `Docs/LOCAL_TESTING.md`)
and runs the pgTAP files in this folder against it. The tests create their own
fixture users, switch among the `anon` and `authenticated` roles, and roll back
all their changes. Their recipe counts only look at their own fixture rows, so
the demo data from `supabase/seed.sql` doesn't affect the results.

Do not run `supabase db reset --remote` or `supabase db push --remote` for this test.
