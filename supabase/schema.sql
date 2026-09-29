-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Sets up the tables accounts need: decks you create, decks you save, and your practice history.
-- These aren't wired into the app's data layer yet (see CLAUDE.md phase 3 notes) but the schema
-- is ready so that follow-up can land without another round-trip to the SQL editor.

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
