@AGENTS.md

# Memory App (working name)

A flashcard website built around a visualization memory technique: learners turn each thing to remember
into a vivid association object and, for ordered material, place those objects along a route through a
familiar place (a memory palace). Text-first by design: images are rare, so learners use their own imagination.

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
  session (`user`, `loading`, `configured`).
- `src/proxy.ts`: refreshes the auth cookie on every request. Next.js 16 renamed `middleware.ts` to
  `proxy.ts` — see `node_modules/next/dist/docs/.../proxy.md`, don't reintroduce a `middleware.ts`.
- `/account`: sign in / create account / forgot password (email + password; Supabase sends the emails).
  `/account/reset-password` + `src/app/auth/callback/route.ts` complete the reset and email-confirmation links.
- `supabase/schema.sql`: run once in the Supabase SQL editor. Defines `decks`, `saved_decks`, and
  `practice_results` tables with row-level security.
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
