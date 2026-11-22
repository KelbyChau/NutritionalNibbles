-- Supabase's default public-table grants include writes; this catalog is read-only to clients.
revoke insert, update, delete, truncate, references, trigger
  on public.foundation_foods from anon, authenticated;
