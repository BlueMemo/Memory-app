@AGENTS.md

# BlueMemo

A flashcard website (bluememo.eu) built around a visualization memory technique: learners turn each thing to
remember into a vivid association object and, for ordered material, place those objects along a route through
a familiar place (a memory palace). Text-first by design: images are rare, so learners use their own imagination.
Team: Erik and David (two computers, two Claude Code sessions). Audience: students and language learners,
Sweden first.

> **How to keep this file.** It is the shared source of truth across both computers, and it is loaded into
> every session, so **keep it short**. Describe what exists *now*, by area, and record decisions with their
> reason. When a feature lands, update the relevant area in a line or two; don't append dated diary entries
> or fix-by-fix narration. Put to-dos for people under "Open items" and delete them when done. Old detail
> lives in git (`git log -p CLAUDE.md`; the long version before the 2026-10-09 trim is `d6f92a9:CLAUDE.md`).

## Working together (read first)

- `main` deploys straight to the live site via Vercel, so **never develop on `main`**. Start a session with
  `git pull` on `main`; work on a branch `feature/<short-name>` made from fresh `main`; commit as you go.
- Pushing a branch makes a Vercel preview (behind Vercel login; use the deployment's Share button for
  outsiders). Previews use the **live Supabase database**: test destructive things with a throwaway account.
- **Finishing a feature** (ask the user first; push/merge only when they say so, e.g. "merge it and push
  it"): merge the latest `main` into the branch, run `typecheck`, `lint`, `test`, `build`, push, then
  `gh pr create`, and merge when the `checks` workflow passes (`gh pr merge --merge` or auto-merge). `main`
  is protected: PR only, the `checks` check must pass, branch up to date with `main`.
- `gh` on Erik's computer: `C:\Program Files\GitHub CLI\gh.exe` (full path if not on PATH), signed in as
  `ErikNyabako`. David's computer needs `winget install GitHub.cli` + `gh auth login` for the same.
- **Files that collide**: `src/i18n/en.ts` + `sv.ts`, `globals.css`, `CLAUDE.md`, `AccountDashboard.tsx`.
  Keep *both* sides' additions; never force-push. **After a keep-both merge of `globals.css`, check the
  braces**: a lost `}` has twice nested half the stylesheet and broken the live site.
- **Database**: one shared Supabase project (Erik's account; David isn't a member yet, so Erik runs SQL).
  `supabase/schema.sql` is safe to re-run in full; whenever it changes, say so in the PR and tell Erik to
  re-run it. A new table holding learner data also goes into `EXPORT_TABLES` and needs `on delete cascade`
  from `auth.users`. **Test RLS changes signed out too** (`curl` the REST endpoint with the publishable key).
- The users are git beginners: Claude runs the git commands and explains in plain words.

## Open items (for people, not code)

- Erik: paste the templates in `supabase/email-templates/` (incl. `confirm-signup.html`) into Supabase →
  Authentication → Emails; check Site URL is `https://bluememo.eu` and `https://bluememo.eu/auth/callback`
  is in Redirect URLs (keep `http://localhost:3000/auth/callback` for local work).
- Re-run `schema.sql` if not done since the onboarding change (adds `user_settings.goals`, `signup_sources`).
- Switch on Vercel Analytics (project → Analytics); until then the script isn't served.
- Untested end to end: "My shared decks" signed in (check on a preview), the sign-up profile picture.
- Contact email mismatch: the site uses `memoblue.team@gmail.com` (`CONTACT_EMAIL` in `AboutView.tsx`, legal
  texts); the business document says `bluememo.team@gmail.com`. Find out which exists, then fix.
- Before launch: launch scope (official decks, paid or not, date); Vercel Hobby is non-commercial (needs a
  paid plan); Supabase free tier pauses and has no backups; have a lawyer read the legal texts; mention the
  in-site Report button in the terms; redraw the Nigerian flag (`Illustration.tsx`) in the new flat style.

## The product today, by area

**Pages**: `/` landing, `/start` introduction, `/discover`, `/library` (+ `/library/settings`, `/add`,
`/cards`, `/import`, `/new`, `/edit/[deckId]`), `/skills` (Memory Tree), `/about`, `/techniques`,
`/settings`, `/account` (+ `/reset-password`), `/decks/[deckId]` (+ `/practice`, `/review`), `/shared/[id]`,
`/admin/reports`, `/privacy`, `/terms`, `/legal`, `/celebrations` (unlinked preview).

**Landing and introduction**
- Landing (`LandingView.tsx`): split hero; on the right `RoutePreview` shows the 10 countries deck's first
  stop (drawing, scene, "stands for") and **Practise this deck** (saves it, opens the guided practice).
  Then "How it works" as a vertical route, the techniques as a bento, the official decks, a blue closing band.
- First visit to `/` (signed out, no decks, introduction not done) goes to `/start` (`OnboardingView.tsx`):
  welcome screen → questions (what you study, which language / where, how you heard of us) → the 10
  countries tutorial (no header, ✕ to leave) → account offer → home. Answers in `lib/onboarding.ts`
  (browser, and `user_settings.goals` when signed in; editable in Settings). "How you heard" is anonymous
  (`signup_sources`). Effects: "Recommended for you" in Discover, an exam-date prompt for school/exam
  learners, the Library's welcome line.
- First-time tours (`CoachTour.tsx`, seen once, `lib/tours.ts`): the Library (when empty or `?welcome=1`)
  and the card form. New accounts land on `/library?welcome=1`.

**Studying**
- Spaced repetition = FSRS via `ts-fsrs` (`lib/srs/core.ts` pure and tested, `lib/srs/store.ts` data:
  guests localStorage `srs.v1`, accounts Supabase, writes in memory first then queued). Modelled on the
  well-known flashcard app's defaults: Again/Hard/Good/Easy (1-4, Space/Enter = Good or the suggested
  grade), new-card waits Again 5m / Hard 10m, Good/Easy graduate straight to FSRS, relearning 10m, day
  rolls over at 4 am, no learn-ahead, no daily review limit. Settings: named presets + per deck new/day,
  exam date (`deckOverrides`, `settingsForDeck()`); a card's `dueBy` or the exam date caps intervals.
  Personal FSRS optimisation (accounts, ≥200 reviews) via `app/api/fsrs/optimize/route.ts`
  (`@open-spaced-repetition/binding`, native, in `serverExternalPackages`).
- Studying a deck = a review (`ReviewSession.tsx`, `/decks/<id>/review`); the deck page's Study now (or
  Space) turns spaced repetition on if needed. Bare study layout with a bottom `StudyBar`: counts, Hint/Show
  answer, grades, Undo (U), Bury (−), Add (A), Edit (E), D back to the deck, shortcuts list (?).
- **Type-the-answer cards**: `Card.answerMode: "type"`, per card on purpose (signed-in decks store fixed
  columns, only `cards` is jsonb). Forgiving check in `lib/typedAnswer.ts` (tested) suggests a grade.
- Guided practice (walkthrough → revision → test, `lib/practice.ts` reducer + `PracticeSession.tsx`) is only
  the demo/tutorial now. Boxed cards, thought-bubble drawings (`Illustration.tsx`), country flags
  (`Flag.tsx`, `Card.flag`).
- Finishing due cards shows one of 15 weighted celebrations (`lib/celebrations.ts`, counted in settings,
  feeding six achievements).
- Keyboard rules on study screens: Tab shows the hint once and only while no control has focus;
  Space/Enter on a keyboard-focused button is that button; bar buttons don't take focus on mouse clicks.

**Decks and library**
- Deck model in `lib/types.ts`: `kind` "ordered" (a route) or "unordered" (associations). Official decks
  are TypeScript in `src/decks/` (or published from the site by a moderator, see Sharing).
- `lib/library.ts` / `lib/userDecks.ts` hooks hide guest vs account storage; `AuthSync.tsx` sets the active
  user for every store (add new account-aware stores there). Guest data can be copied in after signing in.
- Saved decks behave like your own: editing one stores a personal version (`lib/deckOverrides.ts`,
  `lib/editableDecks.ts`, `DeckGate.tsx`), with "Reset to the original".
- Library: tiles or list view (list = aligned columns of counts + a Study now button per row), a gear per
  deck → deck settings (studying, preset, share, export .txt/.csv, edit/delete). Quick add (A), card
  browser (B), import of pasted/uploaded text incl. the other app's plain-text export (`lib/import/parse.ts`),
  deck creator. Dates: cards have `createdAt` (falls back to the deck's), due column shows a date only.

**Sharing and Discover**
- Publish your own deck as **immutable versions** (`published_decks`, `lib/publishedDecks.ts`,
  `SharePanel.tsx`); in Discover or link-only; others "Add a copy" (independent, popularity = copies).
  Discover lists summaries only (no card data). Signed in, Discover has **My shared decks** with "Publish
  update" when your deck changed. Moderators can publish **official** decks (copies, not by reference yet).
- Reporting and moderation (Digital Services Act basics): report form on `/shared/[id]`, `/admin/reports`
  to hide/restore decks (with a reason the author sees) and read problem reports. Moderators are rows in
  `public.admins` (add in the SQL editor); everything is enforced by row-level security.

**Accounts**
- Email + password (Supabase), optional: guest mode is the default and fully works. Usernames are required
  at sign-up (`profiles`, created by the `handle_new_user` trigger). Avatars: upload (≈10 KB data URL in
  `profiles.avatar_url`) or one of 25 drawn pictures (`avatar:<id>`); move to Storage if profiles are ever
  listed in bulk. Account page: stats, streak heatmap, achievements, change username/password/email,
  download my data (`lib/exportData.ts`), delete account (`delete_my_account()` SQL function, so no secret
  key in Vercel).
- Emails go through Resend SMTP from `no-reply@bluememo.eu` (free tier ≈100/day); branded EN/SV templates
  chosen by user metadata `lang`. Confirm links use `/auth/confirm` (`token_hash`, any device); the PKCE
  `/auth/callback` sends failures to `/account?notice=…`.
- `src/proxy.ts` refreshes the auth cookie (Next 16's name for middleware; don't add `middleware.ts`).
  Supabase helpers degrade to guest-only when not configured. Use the publishable key, never the secret one.

**Look and feel**
- Plain CSS in `src/app/globals.css`, tokens on `:root` (dark) and `:root[data-theme="light"]`. Theme
  defaults to the device ("system"); dark `--bg #15181d`, light "paper and ink" `--bg #f4efe4`. One brand
  blue (`--brand-blue`/`--accent`, text on it `--brand-on-blue`); study colours `--srs-*` (fills) and
  `--srs-*-text` (text).
- Geist for everything, Geist Mono for numbers; Newsreader (`--font-serif`) only on the welcome screen.
  Shapes: buttons/tags pills, surfaces `--radius-surface` 16px, fields `--radius-field` 10px.
- Icons: `@phosphor-icons/react` (import from `@phosphor-icons/react/ssr`), not hand-drawn SVGs or ★/→
  characters. Drawings (`Illustration.tsx`) are flat, no outlines. Logo in `LogoArt.tsx`; `app/icon.svg` is
  a static copy, keep them in step.
- Settings (`/settings`, per device in `lib/preferences.ts`): theme, text size, reduce motion, library view.
  Caveat: `setPreferences` saves every field, so anyone who touched appearance before 2026-10-08 is stuck on
  dark until they pick "Match device".
- Accessibility basics are in place (skip link, labelled/announced forms, contrast-checked colours).

**Infrastructure**
- Vercel project `bluememo` (David's Vercel account) deploys `BlueMemo/Memory-app` `main` to bluememo.eu;
  DNS at Namecheap (Vercel records + Resend records). GitHub Actions `checks.yml` runs typecheck (which
  runs `next typegen` first), lint, tests, build.
- Problem reports (`problem_reports`, `lib/problemReports.ts`, `instrumentation*.ts`, "Report a problem"),
  kept 90 days. Visitor stats: Vercel Web Analytics (cookieless, so no consent banner).
- Share previews: Open Graph images from `lib/og/` (always use `pageMetadata()`).
- Legal pages from i18n `legal`; they promise no ads/tracking, only necessary cookies, minimum age 13,
  Supabase (Ireland) and Vercel as processors, Swedish law. **If any of that changes, update the texts and
  their `updatedDate` in the same PR.**

## Decided, not built yet

- Offline use with sync later (queue failed writes locally, replay when online, refresh on focus); not
  before the soft launch.
- Official decks saved by reference with stable URLs; a Swedish demo deck; direct `.apkg` import; a trigram
  index for search once there are thousands of published decks; loading states for pages that render
  nothing while loading; an upload size/type check.

## Commands

- `npm run dev` (http://localhost:3000), `npm test` (Vitest), `npm run typecheck`, `npm run lint`,
  `npm run build`. After pulling a change to `package.json`, run `npm install`.

## Conventions

- Every user-facing string goes through `useI18n()`; `en.ts` is the source of truth and `sv.ts` has the
  same keys. Deck content has its own `language` and is never translated.
- In deck text, `**bold**` marks emphasis and CAPITAL runs in visualizations mark the sound-alike part.
- The brand is **BlueMemo**, one word. **Never name Anki or any other competing app anywhere a visitor
  can see** (text, served CSS, errors); source comments and identifiers may. Say "FSRS", "spaced
  repetition" or "another flashcard app".
- No em dashes in site copy (design decision with the redesign).
- The About page's team story (`about.teamBody`) comes from David's notes; change it only with the team.

## Roadmap

Built: practice engine, deck creator and library, accounts and sync, FSRS spaced repetition, sharing with
versions, search and moderation, onboarding. **Next: the test-group launch** (see Open items).
