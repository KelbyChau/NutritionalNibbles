# Local database tests

Requires Docker and the Supabase CLI. From the repository root:

```sh
supabase start
supabase db reset
supabase test db
```

`db reset` applies the migrations to the **local** database. `test db` runs
`database.sql` with pgTAP. The test creates two fixture users, switches among
`anon` and `authenticated` roles, and rolls back all fixture changes.

Do not run `supabase db reset --remote` or `supabase db push --remote` for this test.
