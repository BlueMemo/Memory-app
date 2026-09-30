@AGENTS.md

# MemoVerse

A flashcard website built around a visualization memory technique: learners turn each thing to remember
into a vivid association object and, for ordered material, place those objects along a route through a
familiar place (a memory palace). Text-first by design: images are rare, so learners use their own imagination.

> **Keep this file current.** The team works on this project from multiple devices, and this file — not
> chat history on any one of them — is the shared source of truth. Whenever a plan, decision, or piece of
> in-progress work comes up, record it here (in "Current status" below, or the relevant section) with
> enough detail that a session on a different device, with no memory of the conversation, can pick up
> where things left off. Prefer editing this file over leaving decisions undocumented.

## Current status

- **Jump straight to revision, added (2026-10-01)**: the deck page now has a second button next to
  "Start practising" that skips the intro/overview/walkthrough and goes straight into a revision round
  with every card — for a deck you've already learned and just want to test yourself on. Implemented as
  `?mode=review` on the practice route (`initReviewSession` in `practice.ts`, read via the page's
  `searchParams` prop and threaded down through `UserDeckGate` — deliberately not `useSearchParams()`,
  which would have broken static prerendering of the official decks' practice pages). Side effect:
  `/decks/[deckId]/practice` is no longer statically prerendered at build time (now server-rendered per
  request) since it depends on the search param — a deliberate, acceptable trade-off for the feature.
- **Name decided: MemoVerse.** Was called "Memory App" (working name) up to 2026-10-01; renamed in the
  site's displayed name and page titles (`i18n` `siteName`, `layout.tsx` metadata). Not renamed: the local
  folder (`C:\memory-app`), the GitHub repo (`Memory-app`), `package.json`'s internal `name` field, or the
  Supabase project's display name — those are just internal/cosmetic identifiers, left alone to avoid
  unnecessary churn; rename them too if it starts feeling inconsistent, but nothing user-facing depends on it.
- **Usernames added** (2026-10-01): sign-up now requires a username (3-20 letters/numbers/underscores,
  globally unique) alongside email + password, stored in a public `profiles` table (`supabase/schema.sql`)
  — chosen over stuffing it into Supabase auth metadata because phase 4 (sharing) will need to publicly
  attribute decks to a username, which requires it to be queryable, not just metadata on the auth record.
  A Postgres trigger (`handle_new_user`) creates the profile row from `options.data.username` at sign-up
  time, since there's no active session yet to satisfy a client-side RLS insert before the email is
  confirmed. Accounts created *before* this existed have no profile row: `AccountView`'s signed-in view
  shows a "choose a username" form for that case, and the header (`SiteHeader`'s `AuthStatus`) shows
  "Set a username" instead of a name until one exists. The header shows the username, not the email
  (`useUser()` now fetches it alongside the session) — this was a deliberate choice so the public-facing
  indicator doesn't leak your email. **Pending**: whoever set up the earlier Supabase project needs to
  re-run `supabase/schema.sql` once more (safe — every statement is re-runnable) to actually create the
  `profiles` table/trigger, since it was added to that file after the project was first set up. Until
  that's done, sign-up will show a generic error rather than working (`checkUsername` returns `"error"`
  when the table's missing, which the UI maps to a generic message, not a false "taken").
  **Found and fixed (2026-10-01)**: `create policy` has no "if not exists" form, so the original
  `schema.sql` broke on re-run with `policy "..." already exists` — added `drop policy if exists` before
  every `create policy` so the whole file is genuinely safe to re-run, as the file's own top comment claims.
  **Also found and fixed**: after claiming a username, the header still showed "Set a username" — each
  `useUser()` call fetches independently with no shared cache, so the header's instance had no way to
  know a change happened elsewhere. Added `notifyUsernameChanged()` (in `useUser.ts`) that every instance
  subscribes to and `AccountView` calls after a successful claim, so all instances refetch immediately.
- **Deployment paused, on purpose**: decided to deploy to Vercel (free tier) on a free `*.vercel.app`
  subdomain rather than buying a custom domain yet — picking a permanent domain/name is a bigger,
  less-reversible decision better made once we're happier locking in a name; the free subdomain removes
  the "only works on localhost" limitation (e.g. confirmation/reset emails only opening on the machine
  running `npm run dev`) without that pressure. **However**, the team decided to first make some more
  minor edits/tweaks locally before actually going through the Vercel + domain setup, so that isn't
  in progress right now — it's the next thing after the current round of tweaks. When it's time to pick
  this back up: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the Vercel project's
  environment variables (same values as `.env.local`), and in Supabase → Authentication → URL
  Configuration, set "Site URL" to the new Vercel URL and add `<url>/auth/callback` to "Redirect URLs" —
  otherwise production auth emails will still point at localhost.
- **Auth method decision**: email + password (with reset), not magic-link — chosen because Supabase makes
  password reset genuinely easy to build (it hosts the email + token verification), and the team wants
  password auth eventually anyway.
- **Guest mode decision**: signing in is optional, not required. Guest mode (browser storage) stays the
  default for anyone who doesn't sign in; an account is an upgrade for cross-device sync, not a gate.
- **Supabase project**: created under the project name "Memory App" (region: eu-west-1 / Ireland). Uses
  the newer Supabase "publishable key" format (`sb_publishable_...`), not the legacy JWT anon key — both
  work as the `NEXT_PUBLIC_SUPABASE_ANON_KEY` value, but new setup should use the publishable key from
  Project Settings → API Keys → "Publishable and secret API keys" tab. Never use the "Secret key"
  (`sb_secret_...`) client-side or share it — it bypasses row-level security.

## Commands

- `npm run dev`: dev server on http://localhost:3000
- `npm test`: unit tests (Vitest)
- `npm run typecheck`, `npm run lint`, `npm run build`

## Structure

- `src/lib/types.ts`: the deck and card model. `Deck.kind` is `"ordered"` (a memory route, fixed order,
  practised by position) or `"unordered"` (loose associations, shuffled).
- `src/lib/practice.ts`: the practice flow as a pure reducer:
  intro → overview → walkthrough → revision rounds (repeat missed cards until all known) → mastered → test → results.
  Keep UI concerns out of it; it is covered by `practice.test.ts`.
- `src/components/PracticeSession.tsx`: renders the flow; keyboard shortcuts live here.
- `src/decks/`: official decks as TypeScript data. User decks live in browser storage (guest mode) or,
  once signed in, in Supabase (see Accounts below) — the same `Deck[]`/`Card[]` shape either way.
- Pages (tabs in `SiteHeader`): `/discover` (official + future community decks; `/` redirects here),
  `/library` (saved + created decks), `/about`, `/account` (sign in/up), plus
  `/decks/[deckId]`, `/decks/[deckId]/practice`, and `/library/new` / `/library/edit/[deckId]` (the deck creator).
- `src/lib/library.ts` / `src/lib/userDecks.ts`: saved deck ids and created decks. Each hook/mutator
  (`useSavedDeckIds`, `useUserDecks`, `addUserDeck`, ...) checks the active user (set by
  `components/AuthSync.tsx`) and transparently reads/writes Supabase when signed in, browser storage
  otherwise — callers never branch on auth state themselves. Mutators are `async` because the signed-in
  path awaits a network call.
- The About page's "Who we are" text is a placeholder waiting for the team's own story.
- `src/i18n/`: site text. `en.ts` is the source of truth; `sv.ts` must have the same keys. Deck content has
  its own `language` and is never translated by the site.

## Accounts (Supabase)

- `src/lib/supabase/`: `config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (see `.env.local.example`); every client/server helper checks `supabaseConfigured` first and degrades
  to guest-only mode (returns `null`) when no project is set up, so the app never hard-depends on Supabase.
- `client.ts` / `server.ts`: browser and server Supabase clients. `useUser()`: client hook for the current
  session (`user`, `username`, `loading`, `configured`) — fetches the `profiles` row alongside the session.
- `profiles.ts`: `isValidUsername`, `isUsernameAvailable` (pre-check before signing up / claiming one),
  `claimUsername` (for pre-existing accounts with no profile row).
- `src/proxy.ts`: refreshes the auth cookie on every request. Next.js 16 renamed `middleware.ts` to
  `proxy.ts` — see `node_modules/next/dist/docs/.../proxy.md`, don't reintroduce a `middleware.ts`.
- `/account`: sign in / create account / forgot password (email + password; Supabase sends the emails).
  `/account/reset-password` + `src/app/auth/callback/route.ts` complete the reset and email-confirmation links.
- `supabase/schema.sql`: run in the Supabase SQL editor (every statement is safe to re-run — just
  re-paste the whole file whenever it changes rather than tracking which parts are new). Defines `decks`,
  `saved_decks`, `practice_results`, and `profiles` tables with row-level security.
- `components/AuthSync.tsx` (mounted in `SiteHeader`): the single place that calls each data module's
  `setActiveUserFor*(userId | null)` when the signed-in user changes. Add any new account-aware store here.
- `components/ImportGuestDataPrompt.tsx`: shown once in Library after signing in, if this browser has
  guest-mode decks; offers to copy them into the account (`importLocalDecksToAccount` /
  `importLocalSavedDecksToAccount`) rather than losing them.
- `lib/practiceResults.ts`: records each completed test's score to `practice_results` when signed in
  (see the `results`-phase effect in `PracticeSession.tsx`). Guest mode has nowhere to keep history, so
  this is a no-op until signed in. Not surfaced in the UI yet (no history view) — next up if useful.

## Conventions

- Every piece of user-facing site text goes through `useI18n()`; never hard-code UI strings in components.
- In deck text, `**bold**` marks emphasis and CAPITAL runs in visualizations mark the sound-alike part.
- Styling is plain CSS in `src/app/globals.css` with colour tokens on `:root` (light and dark).

## Roadmap (agreed with the team)

1. Practice engine + official decks (done)
2. Guided deck creator and personal library (guest mode, browser storage) (done)
3. Accounts (Supabase) and progress tracking; FSRS scheduling later — **in progress**: sign in/up/out,
   password reset, decks/library synced to accounts, and practice-result recording are all built (see
   Accounts above). Remaining: a UI to actually see your practice history, and FSRS-based scheduling.
4. Sharing: publish decks (published versions are immutable; authors post a new version),
   public list + search, save or "make my own copy"
5. Test-group launch

Open decision: large decks (50+ cards) will likely be split into chapters of ~10; the engine currently assumes ~10.
