-- One row per signed-up user, in our own schema next to their recipes.
--
-- Supabase Auth keeps the login itself (email, hashed password) in
-- auth.users. This table is the app's side of that account: it links to the
-- auth user by id and is filled in by a trigger, so the sign-up page never
-- writes to it directly.
--
-- Guests who save a recipe get an anonymous auth user (lib/my-recipes.ts).
-- They don't get a profile until they sign up with an email.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile. Nobody writes to it through the API;
-- the trigger below keeps it in sync with auth.users.
create policy "Users can read their own profile"
on public.profiles for select
to authenticated using (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- Runs as the table owner so it can write the profile while the user is
-- still being created. search_path is empty so every name is spelled out.
create function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_anonymous or new.email is null then
    return new;
  end if;
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email, updated_at = now();
  return new;
end;
$$;

revoke execute on function public.sync_profile_from_auth_user() from public, anon, authenticated;

-- A new email + password sign-up.
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.sync_profile_from_auth_user();

-- A guest turning into a real account, or a user changing their email.
create trigger on_auth_user_email_changed
after update of email, is_anonymous on auth.users
for each row
when (old.email is distinct from new.email or old.is_anonymous is distinct from new.is_anonymous)
execute function public.sync_profile_from_auth_user();

-- Accounts that signed up before this table existed.
insert into public.profiles (id, email, created_at)
select id, email, created_at
from auth.users
where not is_anonymous and email is not null
on conflict (id) do nothing;
