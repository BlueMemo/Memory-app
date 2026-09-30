-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste the whole file -> Run.
-- Every statement here is safe to re-run (create-if-not-exists / create-or-replace), so whenever
-- this file changes, just re-run the whole thing rather than tracking which parts are new.
-- Sets up the tables accounts need: decks you create, decks you save, your practice history,
-- and public profiles (usernames).

create table if not exists public.decks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  language text not null,
  kind text not null check (kind in ('ordered', 'unordered')),
  order_label text,
  instructions jsonb not null default '[]'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decks enable row level security;

drop policy if exists "Users manage their own decks" on public.decks;
create policy "Users manage their own decks"
  on public.decks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.saved_decks (
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, deck_id)
);

alter table public.saved_decks enable row level security;

drop policy if exists "Users manage their own saved decks" on public.saved_decks;
create policy "Users manage their own saved decks"
  on public.saved_decks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.practice_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  score int not null,
  total int not null,
  completed_at timestamptz not null default now()
);

alter table public.practice_results enable row level security;

drop policy if exists "Users manage their own practice results" on public.practice_results;
create policy "Users manage their own practice results"
  on public.practice_results
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists practice_results_user_deck_idx
  on public.practice_results (user_id, deck_id, completed_at desc);

-- Keeps updated_at current whenever a deck row is edited.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

-- Public profiles: usernames shown instead of email, and (once sharing lands) attributed on decks.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 20),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone can look up a username (needed to show "created by X" on shared decks later);
-- only the owner can create or change their own row.
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Creates a profile automatically from the username passed as `options.data.username` at sign-up,
-- so new accounts always have one without a client-side round trip that needs an active session
-- (there isn't one yet at sign-up time, before the confirmation email is clicked).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
