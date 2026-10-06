-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste the whole file -> Run.
-- Every statement here is safe to re-run (create-if-not-exists / create-or-replace), so whenever
-- this file changes, just re-run the whole thing rather than tracking which parts are new.
-- Sets up the tables accounts need: decks you create, decks you save, your practice history,
-- public profiles (usernames), and spaced repetition (FSRS) scheduling.

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

-- Profile photo: a small (about 160px, JPEG) image kept inline as a data URL, so it needs no storage
-- bucket. The length cap keeps a bad client from stuffing a huge file into a publicly readable row.
-- If profiles get listed in bulk later (sharing), move photos to Supabase Storage instead.
alter table public.profiles add column if not exists avatar_url text
  check (avatar_url is null or char_length(avatar_url) <= 60000);

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

-- ---------- Personal versions of saved decks ----------
-- When a learner edits a saved (official/shared) deck, their edited copy is kept here under the original
-- deck's id; everyone else keeps seeing the original. See src/lib/deckOverrides.ts.
create table if not exists public.deck_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  deck jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, deck_id)
);

alter table public.deck_overrides enable row level security;

drop policy if exists "Users manage their own deck versions" on public.deck_overrides;
create policy "Users manage their own deck versions"
  on public.deck_overrides
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- Spaced repetition (FSRS, as in Anki) ----------
-- deck_id/card_id are text and not foreign keys: they can point at official decks (defined in code)
-- as well as at rows in public.decks.

-- Per-user settings; `srs` holds the spaced repetition options (see SrsSettings in src/lib/srs/core.ts).
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  srs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users manage their own settings" on public.user_settings;
create policy "Users manage their own settings"
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Which decks have spaced repetition switched on.
create table if not exists public.srs_deck_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  enabled boolean not null default true,
  primary key (user_id, deck_id)
);

alter table public.srs_deck_settings enable row level security;

drop policy if exists "Users manage their own deck SRS settings" on public.srs_deck_settings;
create policy "Users manage their own deck SRS settings"
  on public.srs_deck_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Each card's current schedule. Cards without a row are new.
create table if not exists public.srs_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  card_id text not null,
  due timestamptz not null,
  stability double precision not null,
  difficulty double precision not null,
  elapsed_days double precision not null default 0,
  scheduled_days double precision not null default 0,
  learning_steps int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state smallint not null check (state between 0 and 3), -- 0 new, 1 learning, 2 review, 3 relearning
  last_review timestamptz,
  primary key (user_id, deck_id, card_id)
);

alter table public.srs_cards enable row level security;

drop policy if exists "Users manage their own card schedules" on public.srs_cards;
create policy "Users manage their own card schedules"
  on public.srs_cards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists srs_cards_user_due_idx on public.srs_cards (user_id, due);

-- Every answer given, like Anki's review log. Kept in full so FSRS parameters can be
-- optimized from a user's own history later.
create table if not exists public.srs_review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  card_id text not null,
  rating smallint not null check (rating between 1 and 4), -- 1 again, 2 hard, 3 good, 4 easy
  state smallint not null, -- the card's state before this answer
  review timestamptz not null,
  due timestamptz not null,
  stability double precision not null,
  difficulty double precision not null,
  elapsed_days double precision not null default 0,
  last_elapsed_days double precision not null default 0,
  scheduled_days double precision not null default 0,
  learning_steps int not null default 0
);

alter table public.srs_review_logs enable row level security;

drop policy if exists "Users manage their own review logs" on public.srs_review_logs;
create policy "Users manage their own review logs"
  on public.srs_review_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists srs_review_logs_user_review_idx on public.srs_review_logs (user_id, review desc);

-- ---------- Shared decks ----------

-- Published copies of learners' own decks. A published version never changes: publishing again adds a
-- new row with the next version number for the same (author, source deck), and Discover shows the
-- latest. `listed = false` means "only people with the link": the row is still readable by anyone who
-- has its id (a random uuid), it just isn't listed or searchable.
create table if not exists public.published_decks (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  source_deck_id text not null,
  version int not null default 1 check (version >= 1),
  listed boolean not null default true,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  language text not null,
  kind text not null check (kind in ('ordered', 'unordered')),
  card_count int not null default 0,
  deck jsonb not null,
  -- Lower-cased title, description and card text, for search.
  search_text text not null default '',
  -- Publishing options: show the author's profile photo, and the author's own settings for the deck
  -- (spaced repetition options, chapters) that a copy starts with.
  show_avatar boolean not null default true,
  deck_settings jsonb,
  -- How many learners added a copy of this version to their library (kept by a trigger, see below).
  copy_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (author_id, source_deck_id, version)
);

-- For databases where published_decks was created before these columns existed.
alter table public.published_decks add column if not exists show_avatar boolean not null default true;
alter table public.published_decks add column if not exists deck_settings jsonb;
alter table public.published_decks add column if not exists copy_count int not null default 0;

alter table public.published_decks enable row level security;

-- (Who may read published decks is decided in "Moderation of shared decks" below, because hidden decks
-- are only visible to their author and to moderators.)
drop policy if exists "Published decks are publicly readable" on public.published_decks;

-- (The insert policy lives in "Moderation of shared decks" below, since only moderators may publish official decks.)
drop policy if exists "Authors publish their own decks" on public.published_decks;

drop policy if exists "Authors unpublish their own decks" on public.published_decks;

create index if not exists published_decks_listed_created_idx on public.published_decks (listed, created_at desc);

-- Who added a copy of which version: one row per learner and version, so popularity can't be inflated
-- by copying the same deck over and over. Learners only see and add their own rows.
create table if not exists public.published_deck_copies (
  published_id uuid not null references public.published_decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (published_id, user_id)
);

alter table public.published_deck_copies enable row level security;

drop policy if exists "Learners record their own copies" on public.published_deck_copies;
create policy "Learners record their own copies"
  on public.published_deck_copies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keeps published_decks.copy_count up to date (authors can't update their rows themselves).
create or replace function public.count_published_copy()
returns trigger as $$
begin
  update public.published_decks set copy_count = copy_count + 1 where id = new.published_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_published_deck_copied on public.published_deck_copies;
create trigger on_published_deck_copied
  after insert on public.published_deck_copies
  for each row execute function public.count_published_copy();

-- ---------- Moderation of shared decks ----------

-- A moderator can hide a published deck (all its versions). Hidden decks disappear from Discover and from
-- their link for everyone except the author, who sees why, and the moderators. People who already made a
-- copy keep it.
alter table public.published_decks add column if not exists hidden boolean not null default false;
alter table public.published_decks add column if not exists hidden_reason text;
alter table public.published_decks add column if not exists hidden_at timestamptz;

-- Official BlueMemo decks are published from a moderator's account with "official" switched on; Discover
-- lists them under Official decks, as made by BlueMemo. Only moderators may set the flag (see the insert
-- policy below). Like any deck, a new version is published to change one, and copies are independent.
alter table public.published_decks add column if not exists official boolean not null default false;

-- Who counts as a moderator. No policies on purpose: nobody can read or change this through the API; add a
-- moderator in the SQL editor, e.g.
--   insert into public.admins (user_id) select id from auth.users where email = 'someone@example.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$ language sql security definer stable set search_path = '';

-- Signed-out visitors need to be able to run it too: the read policy on published_decks below calls it, and
-- a policy that calls a function its user may not run makes every read fail. It only ever answers whether
-- the caller is a moderator, so for a visitor it just says "no".
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "Visible published decks are readable" on public.published_decks;
create policy "Visible published decks are readable"
  on public.published_decks for select
  using (not hidden or auth.uid() = author_id or public.is_admin());

drop policy if exists "Authors publish their own decks" on public.published_decks;
create policy "Authors publish their own decks"
  on public.published_decks for insert
  with check (auth.uid() = author_id and (not official or public.is_admin()));

-- An author can unpublish their own deck unless it was hidden (otherwise removing and republishing would
-- undo a moderator's decision).
create policy "Authors unpublish their own decks"
  on public.published_decks for delete
  using (auth.uid() = author_id and not hidden);

drop policy if exists "Moderators delete published decks" on public.published_decks;
create policy "Moderators delete published decks"
  on public.published_decks for delete
  using (public.is_admin());

drop policy if exists "Moderators hide and restore decks" on public.published_decks;
create policy "Moderators hide and restore decks"
  on public.published_decks for update
  using (public.is_admin())
  with check (public.is_admin());

-- A deck that a moderator hid can't be published again as a new version.
create or replace function public.block_hidden_republish()
returns trigger as $$
begin
  if exists (
    select 1 from public.published_decks
    where author_id = new.author_id and source_deck_id = new.source_deck_id and hidden
  ) then
    raise exception 'This deck was removed by a moderator and cannot be published again.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists published_decks_block_hidden on public.published_decks;
create trigger published_decks_block_hidden
  before insert on public.published_decks
  for each row execute function public.block_hidden_republish();

-- Reports from learners about a published deck. A learner can report a version once, and sees only their
-- own reports; moderators see and resolve all of them. The deck's title and author are copied in by a
-- trigger so the report stays understandable if the deck is later deleted.
create table if not exists public.deck_reports (
  id uuid primary key default gen_random_uuid(),
  published_id uuid references public.published_decks(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('illegal', 'copyright', 'abusive', 'adult', 'spam', 'other')),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  deck_title text not null default '',
  author_id uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter_id, published_id)
);

alter table public.deck_reports enable row level security;

drop policy if exists "Learners report decks" on public.deck_reports;
create policy "Learners report decks"
  on public.deck_reports for insert
  with check (auth.uid() = reporter_id and status = 'open' and resolved_at is null);

drop policy if exists "Learners and moderators read reports" on public.deck_reports;
create policy "Learners and moderators read reports"
  on public.deck_reports for select
  using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "Moderators resolve reports" on public.deck_reports;
create policy "Moderators resolve reports"
  on public.deck_reports for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists deck_reports_status_idx on public.deck_reports (status, created_at desc);

create or replace function public.fill_deck_report()
returns trigger as $$
begin
  select title, author_id into new.deck_title, new.author_id
  from public.published_decks where id = new.published_id;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists deck_reports_fill on public.deck_reports;
create trigger deck_reports_fill
  before insert on public.deck_reports
  for each row execute function public.fill_deck_report();

-- The newest version of each published deck (what Discover lists and searches), with its popularity:
-- copies of all its versions together. Dropped first because its columns changed over time.
drop view if exists public.published_decks_latest;
create view public.published_decks_latest
  with (security_invoker = true) as
  select distinct on (p.author_id, p.source_deck_id)
    p.*,
    (
      select coalesce(sum(v.copy_count), 0)::int
      from public.published_decks v
      where v.author_id = p.author_id and v.source_deck_id = p.source_deck_id
    ) as total_copies
  from public.published_decks p
  order by p.author_id, p.source_deck_id, p.version desc;

-- Problem reports: errors the site catches in the browser or on the server, and messages learners send
-- with "Report a problem". Anyone (guests too) may add one; nobody but the team can read them, except
-- signed-in learners their own (for "Download my data"), and moderators all of them (on /admin/reports).
-- Kept for 90 days: every insert also clears out older rows.
create table if not exists public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('error', 'server-error', 'feedback')),
  message text not null check (char_length(message) between 1 and 4000),
  detail text check (char_length(detail) <= 8000),
  path text check (char_length(path) <= 300),
  user_agent text check (char_length(user_agent) <= 400),
  version text check (char_length(version) <= 64),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.problem_reports enable row level security;

drop policy if exists "Anyone can send a problem report" on public.problem_reports;
create policy "Anyone can send a problem report"
  on public.problem_reports
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Users read their own problem reports" on public.problem_reports;
create policy "Users read their own problem reports"
  on public.problem_reports
  for select
  to authenticated
  using (user_id = auth.uid());

create index if not exists problem_reports_created_idx on public.problem_reports (created_at desc);

-- Moderators read the reports on /admin/reports, mark them handled, and can delete them.
alter table public.problem_reports add column if not exists handled_at timestamptz;

drop policy if exists "Moderators read problem reports" on public.problem_reports;
create policy "Moderators read problem reports"
  on public.problem_reports
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Moderators handle problem reports" on public.problem_reports;
create policy "Moderators handle problem reports"
  on public.problem_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Moderators delete problem reports" on public.problem_reports;
create policy "Moderators delete problem reports"
  on public.problem_reports
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.delete_old_problem_reports()
returns trigger as $$
begin
  delete from public.problem_reports where created_at < now() - interval '90 days';
  return null;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists problem_reports_cleanup on public.problem_reports;
create trigger problem_reports_cleanup
  after insert on public.problem_reports
  for each statement execute function public.delete_old_problem_reports();

-- Lets a signed-in learner delete their own account. Deleting the auth user removes everything they own,
-- because every table above references auth.users with "on delete cascade" (decks, saves, review history,
-- settings, profile, published decks and their copy records). Runs with the owner's rights because the
-- browser may not touch auth.users directly; it can only ever delete the caller's own row.
create or replace function public.delete_my_account()
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = '';

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Indexes for speed ----------

-- Each of these answers a query the site makes all the time, or the scan Postgres does when an account is
-- deleted (every table that points at auth.users with "on delete cascade" is searched for that user's rows).
-- With a handful of rows nothing is slow; they matter once there is real data.

-- The Library loads "my decks, newest first"; decks are otherwise only indexed by their own id.
create index if not exists decks_user_created_idx on public.decks (user_id, created_at desc);

-- The account page's test history across all decks (the existing index leads with the deck).
create index if not exists practice_results_user_completed_idx on public.practice_results (user_id, completed_at desc);

-- "Which versions did I copy": the primary key leads with the published deck, not the learner.
create index if not exists published_deck_copies_user_idx on public.published_deck_copies (user_id);

-- Hiding a deck closes its open reports, and deleting a deck clears the link from its reports.
create index if not exists deck_reports_published_idx on public.deck_reports (published_id);

-- Users' own problem reports (account export and account deletion); guests' reports have no user.
create index if not exists problem_reports_user_idx on public.problem_reports (user_id) where user_id is not null;
