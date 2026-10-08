@AGENTS.md

# BlueMemo

A flashcard website built around a visualization memory technique: learners turn each thing to remember
into a vivid association object and, for ordered material, place those objects along a route through a
familiar place (a memory palace). Text-first by design: images are rare, so learners use their own imagination.

> **Keep this file current.** The team works on this project from multiple devices, and this file — not
> chat history on any one of them — is the shared source of truth. Whenever a plan, decision, or piece of
> in-progress work comes up, record it here (in "Current status" below, or the relevant section) with
> enough detail that a session on a different device, with no memory of the conversation, can pick up
> where things left off. Prefer editing this file over leaving decisions undocumented.

## Working together (two people, two Claude Code sessions) — read first

`main` deploys straight to the live site (bluememo.eu) via Vercel, so **never develop on `main`**.
- **Start of a session**: `git pull` on `main`. To begin a feature, create a branch from fresh `main`
  (`feature/<short-name>`) and work there; commit as you go; push the branch whenever (Vercel builds a
  preview URL per branch — but previews use the **live Supabase database**, so test destructive things with
  a throwaway account).
- **Finishing a feature** (ask the user first — that's the release moment): merge the latest `main` into
  the branch, run `typecheck`, `lint`, `test` and `build`, push, then **open a pull request** into `main`
  (`gh pr create`) and merge it once GitHub's **Checks** pass (`gh pr merge --merge`, or auto-merge).
  **`main` is protected** (since 2026-10-07): no direct pushes, not even for owners; every change goes
  through a pull request whose Checks (`.github/workflows/checks.yml`) passed on a branch that is up to date
  with `main`. If `main` moved meanwhile, update the branch (`gh pr update-branch` or merge `main` in) and
  let the checks run again. Keep branches short-lived; merge small and often.
- **GitHub CLI (`gh`) so Claude can open and merge pull requests (set up 2026-10-07)**: before this, Claude
  could only `git push`, which `main`'s protection rejects, so the user had to click through GitHub by hand.
  Installed on Erik's computer with `winget install GitHub.cli` (`C:\Program Files\GitHub CLI\gh.exe`; a
  shell opened before the install doesn't have it on PATH, so use the full path) and signed in with
  `gh auth login --web` as `ErikNyabako` (scopes `repo`, `read:org`, `gist`; revoke at
  github.com/settings/applications). Usual flow once a branch is pushed: `gh pr create --fill`, then
  `gh pr checks --watch`, then `gh pr merge --merge` — **merge only when the user says so** ("merge it and
  push it"). `main`'s protection: the check named `checks` must pass, the branch must be up to date with
  `main`, applies to admins, no approvals needed. If `main` moved, `gh pr update-branch` (or merge `main` in)
  and wait for the checks again. The other partner's computer needs the same one-time setup
  (`winget install GitHub.cli`, `gh auth login`) for his Claude to do this; until then use the web page the
  push prints (`.../pull/new/<branch>`).
- **Shared files that collide**: `src/i18n/en.ts` + `sv.ts`, `globals.css`, `CLAUDE.md`, `AccountDashboard.tsx`.
  When resolving a conflict keep *both* sides' additions; never force-push.
- **Database**: one shared Supabase project. A change to `supabase/schema.sql` takes effect for everyone the
  moment it is run, so say so in the PR/commit and in "Current status" below; whoever merges the change
  tells the other person to re-run the file.
- Users are git beginners: the Claude session runs the git commands, the user only says "start a new
  feature: X" / "finish it".

## Current status

- **Tutorial without header, bigger practice cards (2026-10-08, branch `feature/welcome-theme`)**: when the 10
  countries practice runs as the introduction's tutorial (`tutorialPending`), the site header is hidden
  (`SiteHeader`) and "Exit" is replaced by a big ✕ fixed in the top-left corner (`.tutorial-close`, goes
  home and marks the introduction done). Normal practice keeps the header and Exit. The practice cards
  (instructions, overview, walkthrough) are one size up: 600px wide, taller, and larger text.
  The **thought bubble** sits beside the walkthrough card on wide screens (≥1100px: to the right, centred,
  300×216, tail pointing at the card; narrower: above it, a bit bigger). The **tutorial doesn't scroll**
  (`html:has(.practice.tutorial)` hides overflow; its cards shrink on short screens to fit). While the
  instructions are on screen (the first card or opened with the button), neither the ✕ nor Exit is shown.
- **Theme follows the device by default (2026-10-08, branch `feature/welcome-theme`)**: the default theme is
  now "system" (was dark, the 2026-10-05 brand decision): light devices get paper and ink, dark devices the
  charcoal dark. `THEME_SCRIPT` treats no saved theme as "system". Caveat: `setPreferences` saves every
  field, so anyone who changed *any* appearance setting before has `theme: "dark"` stored and stays dark
  until they pick "Match device" under Settings.
- **Colours: lighter dark, paper light (2026-10-08, branch `homepage`)**: the site keeps its current look and
  dark stays the default, but **dark is lifted a little** (`--bg #15181d`, cards `#1c2026`, lines
  `#2d333b`; was near-black `#0d0f12`) and **light mode is "paper and ink"**: the welcome page's warm paper
  white (`--bg #f4efe4`, cards `#fbf8f1`, lines `#e2dccd`, ink `#16181c`). Only the tokens in
  `globals.css` changed (plus `themeColor` and a warm drawing plate in light mode). A fuller paper-and-ink
  home page was sketched (serif headings, black buttons) but the team chose this lighter touch instead.
- **Introduction / onboarding (2026-10-07, branch `feature/onboarding`)** — Duolingo-style, decided with the
  team via questionnaires. **Order: questions → tutorial → account offer → home page.** A first visit to
  `/` (not signed in, no decks, introduction not done) is sent straight to `/start` (client-side, so link
  previews still see the home page); the home page's button for such visitors is **Get started** (plus
  "I already have an account", → `/start?begin=1`). `/start` opens on a **welcome screen** in "paper and ink"
  (picked by the team from four sketches: night sky, paper and ink, bold blue, doorway); since 2026-10-08 it
  **follows the theme** like the questions (paper in light mode, the dark page with light ink in dark mode),
  has no autofocus (it drew a focus ring), and the introduction has an **EN/SV switch** top right; only the serif title "Step into your memory palace." / "Kliv in i ditt minnespalats." and a
  black **Get started** button (blue on hover), plus a quiet "Sign in" and the ✕ in the corner; the title
  rises in and the button follows. The serif is Newsreader as `--font-serif`, loaded without preloading
  (`layout.tsx`) so other pages don't download it. During the introduction the
  **site header is hidden** (`SiteHeader` renders only `AuthSync` on `/start`); a small **✕** in the corner
  is the only way out (marks it done, goes home). The first question has no back arrow. One question per screen with a
  progress bar (`OnboardingView.tsx`): what you mainly study (languages / school subjects / exams like
  Högskoleprovet / general knowledge & fun) → which language, or where you study (high school /
  university / other) → where you heard about BlueMemo (TikTok, Instagram, YouTube, friend/family,
  school/teacher, search, other) → the **10 countries tutorial** (the full guided practice; its results
  show "Continue" when started from here) → **account step** (create a free account → `/account?signup=1`,
  or "Maybe later" → the home page). Not done: a daily-goal question (not wanted).
  - Answers ("goals") live in `lib/onboarding.ts`: browser (`onboarding.v1`) and, signed in,
    `user_settings.goals` (the account's copy wins; `setActiveUserForOnboarding` in AuthSync); editable
    under Settings → "Your goals". "Where did you hear about us" is **anonymous**: one row in
    `signup_sources` (channel + goal, no user id), once per browser — read it in Supabase.
  - Effects: **Recommended for you** at the top of Discover (the fitting official deck + up to 5 popular
    community decks whose text mentions the language, in English or Swedish, or "högskoleprov"); an
    **exam date prompt** on decks for school/exam learners until the deck has one; the Library's
    **welcome line** follows the goal ("Ready for today's Spanish words?").
  - **Needs `schema.sql` re-run** (adds `user_settings.goals` and `signup_sources`); until then the goals
    stay in the browser only and the source isn't counted — nothing breaks. Privacy policy updated.
  - Also fixed: a `}` lost in the celebrations/typed-answer merge had nested all type-the-answer CSS
    inside `.celebration-stage`, so typed-answer cards were unstyled on the live site.
- **Landing example deck (2026-10-07, branch `feature/list-only`)**: the hero's `RoutePreview` no longer
  steps through stops: it shows the deck's name and card count, the **first stop only** (drawing, scene,
  "stands for"), and a **Practise this deck** button that saves the deck to the library (if it isn't
  already) and opens the guided practice (`/decks/largest-countries/practice`); a line under it says so.
- **D leaves a review for the deck (2026-10-07, branch `feature/d-to-deck`)**: pressing **D** during a
  spaced-repetition review (or on its "done" screen) goes to the deck's page, like Exit; listed under
  Keyboard shortcuts and in Exit's tooltip. Not while typing (typed-answer cards) or with modifier keys.
- **Taste redesign, merged (2026-10-07, branch `feature/taste-redesign`)**: the
  `design-taste-frontend` skill (Erik's computer only) given free rein, "as if used from the start", to
  compare with the current look; the team liked it and merged it. Dials 8 / 6 / 4 (variance / motion / density). **Landing page rebuilt**
  (`LandingView.tsx`): split hero with a working route preview on the right (`RoutePreview.tsx`: the demo
  deck's first three stops with its drawings, via the new `Drawing` export in `Illustration.tsx`; no stock
  photos, since BlueMemo is text-first); "How it works" as a vertical route; the techniques as a bento (one
  large brand-blue cell); the decks in two columns; a full-width brand-blue closing band. The hero rises
  in on load and sections rise in on scroll (CSS only, off with reduced motion). **Site-wide**: Newsreader
  is gone (the skill bans serif headings as a default); headings and the wordmark are Geist bold with tight
  tracking, numbers use Geist Mono (`--font-geist-mono`); section titles are sentence-case headings instead
  of small caps; cooler neutrals (dark `#0d0f12`, light `#f5f6f8` instead of cream); shape rule: buttons,
  tags and switches are pills, surfaces `--radius-surface` (16px), fields `--radius-field` (10px), the
  two-line grade buttons 14px; buttons lift on hover and press on click. **Icons**: `@phosphor-icons/react`
  (new dependency, import from `@phosphor-icons/react/ssr`) replaces the hand-drawn gear and book and the
  ★/→ characters on deck tiles and the save button. **Copy**: the hero lead shortened to 20 words; em
  dashes removed from en/sv (the legal text untouched). Kept on purpose: the team's hero headline (3
  lines on desktop, the skill wants 2), the logo drawing, dark as the default theme. Not touched: the app
  screens' layouts (the skill is for landing pages, not app UI). **Drawings**: the tikka masala and the
  China (chopsticks in shoes) pictures in `Illustration.tsx` were redrawn flat, without outlines, after
  a short questionnaire and a reference photo from the team (a dark bowl of rice and tikka masala on a
  green doormat by a blue front door; sneakers on a shoe tray just inside that door, both chopsticks
  fanned in one shoe). The Nigerian flag still has the old outlined style; redraw it to match.
- **Design audit (2026-10-07, branch `feature/design-audit`)**: the main screens were checked against Vercel's
  Web Interface Guidelines (the `web-design-guidelines` skill, installed on Erik's computer only) and the
  clear findings fixed. **Forms**: sign-in/up fields have `autocomplete`/`name` (password managers work),
  no auto-capitalise on email/username; error and success messages are announced (`role="alert"` /
  `"status"`). **Library list view**: each number carries its label as invisible text for screen readers.
  **Skip to content** link (first Tab on every page, `SiteHeader`); the study screens are `<main>` now.
  **Study screens** (`ReviewSession`, `PracticeSession`): Tab shows the hint once per card and only while
  no control has focus (it used to make the bar's buttons unreachable); Space/Enter on a keyboard-focused
  button is that button's click; when the focused button disappears, focus stays in the bar
  (`StudyBar`); the bar's buttons don't take focus on mouse clicks (`noMouseFocus`), so Space keeps showing
  the answer after clicking e.g. Bury. **Colours**: `--srs-*` are now button fills (Good/Hard darker, so
  white text reads ≥ 4.5:1) and `--srs-*-text` are for coloured text (lighter in dark mode); the guided
  practice's green/amber buttons have dark text. Deliberately left: single-key shortcuts without an off
  switch, Discover filters not in the URL, `theme-color` stays dark in the light theme, the guidelines' Title
  Case rule (doesn't suit Swedish or our style). Next optional step from the plan: try the
  `design-taste-frontend` skill on the landing page only, with calm settings, and show the suggestions
  before changing anything.
- **Space starts studying on the deck page (2026-10-07, branch `feature/space-to-study`)**: Space does what
  "Study now" does (switches spaced repetition on if needed, opens the review); the button shows the key.
  Ignored while typing, with modifier keys, on key repeat, and when a button or link has focus (Space is
  that control's own click there). One `useEffectEvent` handler in `DeckView` handles Space and A.
- **Aligned counts in the Library's list view (2026-10-07)**: each row is a grid (title, card count,
  learning, due, new, gear) with fixed-width columns, so the numbers line up vertically and right-aligned;
  their labels sit once in a header row (coloured like the numbers). Only the numbers in the rows: the card
  count in ink (white), non-zero counts in their colour, zeros a quiet grey, "–" for decks without spaced
  repetition (look modelled on a screenshot from the team; boxes and per-row labels were tried and
  dropped). Each row starts with a **Study now** button (fixed 7.5rem column so the header still lines up),
  which switches spaced repetition on if needed and opens the review — list view only. Up to 720px wide the
  button and title share the first line and the numbers sit below. **The Library is a list only
  (2026-10-07)**: the "rows" and then the "tiles" views were removed, along with the view switch, the
  `libraryView` preference, `CreateDeckTile` and the library's "Edited" tag (the deck page still shows it).
  `DeckTile` is still used by Discover.
- **Due dates and the Library tab (2026-10-07, branch `feature/due-dates`)**: the Due/"Next" column in
  Browse (deck page) and the card browser shows **only a date** (same format as Created) instead of "in 3
  days" — also for cards due later today or already due (no time, no "now"; `lib/dueDate.ts`, tested). The card browser's
  detail panel still shows both. The **Library tab** no longer has the outlined box: it's brand-blue text
  with a book icon and, when there are any, a badge with today's **learning + due** cards (not new ones)
  across the library's decks with spaced repetition on (`DueBadge` in `SiteHeader.tsx`; 99+ caps it).
- **Celebrations (2026-10-07, branch `feature/celebrations`)**: finishing a deck's due cards in a review
  session shows one of **15 celebrations**, drawn by odds (`lib/celebrations.ts`, weights in percent, sum
  100, tested): common 20/15/10/10/10/8 %, uncommon 7/5/5/4/3 %, rare 1.5/1 %, epic 0.4 %, and one
  **legendary at 0.1 %** (the Grand Memory Palace: the logo, gold rays, fireworks). Each has a picture from
  the profile-picture drawings (`AVATAR_ART`), its own drawn particles (`Celebration.tsx`, no emoji), a
  title/line in i18n `celebrations`, and a rarity badge from "uncommon" up. Only after answering cards in
  that session (opening an already finished deck shows the plain "Congratulations"). Particles stay hidden
  with reduced motion. **`/celebrations`** (not linked, noindex) previews all of them.
  Every real celebration is counted in `SrsSettings.celebrations` (id → times seen; `recordCelebration` in
  `srs/store.ts`, synced with the settings), and **six hard achievements** read it: Party animal (100
  celebrations), Lucky find (a rare one), Collector (10 different), Under the northern lights (the epic),
  The Grand Memory Palace (the legendary) and Complete collection (all 15). Only counts from now on.
- **A on the deck page (2026-10-07, branch `feature/deck-add-shortcut`)**: pressing **A** on a deck you can
  edit (your own, or a saved one) opens quick add for that deck (`/library/add?deck=<id>&back=deck`), and an
  "+ Add card [A]" button sits next to Deck settings; Done and the back link return to the deck. Unsaved
  official decks have no button and ignore A.
- **Performance basics (2026-10-07, branch `feature/performance-basics`, stacked on
  `feature/moderator-integrations` — merge that one first)** — prompted by a reel listing five things
- **Type-the-answer cards (2026-10-07, branch `feature/type-answer-cards`)** — the "spelling as answer"
  item from the launch list. A card can be answered by **typing** instead of flipping. Tested by hand in the
  browser (guest mode): typing box, verdicts, grade suggestion, creator toggles, deck settings.
  - **Data**: `Card.answerMode?: "show" | "type"` (missing = show). **Deliberately per card, not per deck**:
    signed-in decks are stored in fixed columns (`deckToRow`), so a deck-level field would silently not
    save, while `cards` is a jsonb column that keeps any card field — no schema change. Published and
    edited-copy decks store the whole deck as jsonb, so the mode travels with them (a moderator can publish
    an official deck with typed cards).
  - **Checking** (`lib/typedAnswer.ts`, tested): forgiving about capitals, punctuation, spaces, apostrophes,
    hyphens and `**bold**` markers; alternatives written `a / b`, `a; b`, `a | b` are all accepted, and a
    `(parenthesised)` part is optional. Accents count: a missing accent is **almost**, as is a one-letter
    slip (an adjacent swap counts as one) in words of 4+ letters, two slips in 9+; short answers and anything
    containing a digit must be exact. Verdicts `correct | almost | wrong | empty` suggest a grade
    (Good / Hard / Again) — the learner still grades, and Space/Enter now take the **suggested** grade on
    typed cards (keys 1–4 still work). `diffSegments` underlines the stray letters in what was typed.
  - **Where it applies**: the spaced-repetition review (`ReviewSession`, via `FlipCard`'s new `typed`,
    `frontExtra`, `backExtra` props and `TypedAnswer.tsx`). The guided technique practice (the landing demo)
    is unchanged. The typing box turns off browser autocorrect/spellcheck on purpose; a held-down Enter
    can't also grade the card (`e.repeat` ignored).
  - **Choosing it**: (1) deck creator/editor details step "How will you answer the cards?" sets the starting
    choice for cards you add (when editing it follows what most existing cards use); (2) on the cards step and
    in the add/edit-card form a "How you answer" toggle per card, **sticky** while adding many cards; the
    card list tags typed cards and has "Set all cards to: show · type"; (3) deck settings
    (`/library/settings?deck=`) has an "Answering cards" section that switches every card at once (also for
    saved/official decks, via a personal copy); (4) import has a "Type the answer" checkbox that marks every
    imported card. Texts: i18n `answerStyle` and `study.check/typeHere/verdict*/youTyped`.
  - **Not built**: typed answers in the guided practice; per-card strictness (e.g. "accents don't matter" for
    a deck where they shouldn't); a "my answer was right" override beyond choosing the grade; speech input.
- **Performance basics (2026-10-07, branch `feature/performance-basics`, merged as PR #3)** — prompted by a reel listing five things
  "vibe-coded" apps miss; we audited all five and chose to do two now: (1) **database indexes** and (2)
  **Discover no longer downloads whole decks**. (Audit result for the rest, not done: uploads are already
  shrunk in the browser to 480px/160px JPEG but have no file-size/type check; there are no loading screens
  (~24 places render nothing while loading); the profile is fetched separately by each `useUser()` and
  Discover/shared decks re-query every visit; the JS is already split per page, ~430 KB gzip in total, nothing
  lazy-loaded yet.)
  - **Discover payload**: list queries (`searchPublishedDecks`) and the share panel (`usePublication`) now
    select `SUMMARY_COLUMNS` — no `deck` column, which holds every card including image data URLs — and
    return a `PublishedSummary` (title, description, kind, language, `cardCount`, flags, copies…). Only
    `getPublishedDeck` (the `/shared/<id>` page) and `publishDeck` still read the full `PublishedDeck`
    (`extends PublishedSummary` with `deck`). Measured against the live database with 3 decks: 1.4 KB
    instead of 40 KB per search. Fallback columns for databases without the newer columns still exist.
  - **Indexes** (end of `schema.sql`, "Indexes for speed"): `decks (user_id, created_at desc)` (the Library
    query), `practice_results (user_id, completed_at desc)`, `published_deck_copies (user_id)`,
    `deck_reports (published_id)`, `problem_reports (user_id)` — also what Postgres scans on account deletion.
    **Re-run `schema.sql`** to create them (safe; no behaviour change). Not done on purpose: a trigram index
    for text search (`search_text ilike '%word%'` needs `pg_trgm` + a GIN index once there are thousands of
    published decks); add it then, as a separate small change, since it needs an extension.
- **Moderator integrations (2026-10-07, branch `feature/moderator-integrations`, merged as PR #2 and tested)**:
  - **Official decks are now published from the site** (replaces writing them as TypeScript in `src/decks/`,
    which still holds the original two, the landing demo and the tests). In a moderator's own deck's
    settings → Share, a **"Publish as an official BlueMemo deck"** checkbox (`SharePanel.tsx`, only shown
    when `useIsAdmin`). It sets `published_decks.official` (always listed). The insert policy
    `Authors publish their own decks` only lets moderators set `official`. Discover lists these under
    **Official decks** after the built-in ones (the Official / Community type filter and the two sections
    split on the flag, `searchPublishedDecks` + `DiscoverView`), tagged "Official" and "by BlueMemo" (no
    personal avatar; same on `/shared/[id]`). **Limitation (v1)**: like community decks they are opened
    at `/shared/<id>` and learners "Add a copy to my library" — an independent copy, not a saved reference,
    so a new official version does not update copies (consistent with "published versions are immutable").
    A later step could make official decks saved *by reference* (they'd update for everyone) and give them
    stable URLs like `/decks/<slug>`; then the built-in TS decks could move to the database too.
  - **Problem reports now work and moderators can read them.** "Report a problem" failed because the
    `problem_reports` table did not exist in Supabase (the schema Erik last ran came from a branch made
    before that feature was merged). Fixed by re-running `schema.sql`; the failure reason is now also logged
    to the browser console. `/admin/reports` has a **"Problems reported by users"** section: messages from
    users (default), caught errors, or everything; **Mark handled / Reopen**, **Delete**, technical
    details (browser, error stack) folded away; `problem_reports.handled_at` is the new column and
    moderators got select/update/delete policies. The "Moderation (n open)" link on the account page now
    counts open deck reports plus unhandled user messages (not caught errors, which are noisy).
  - **Bug found and fixed (signed-out visitors couldn't see ANY published deck)**: the moderation release
    made the read policy on `published_decks` call `public.is_admin()`, but `is_admin()` had been revoked
    from the `anon` role, so every read by a signed-out visitor failed with "permission denied for function
    is_admin" (Discover's community list, `/shared/<id>` links). It now grants execute to `anon` too (it only
    ever answers "are you a moderator", which is "no" for a visitor). **Lesson: test RLS changes signed out
    as well as signed in** (a quick check without logging in: `curl` the REST endpoint with the publishable
    key). **`schema.sql` must be re-run for all of this**; the one-line emergency fix for the
    signed-out bug alone is `grant execute on function public.is_admin() to anon;`.
- **Automatic checks on GitHub (2026-10-07, branch `feature/fix-github`)**: `.github/workflows/checks.yml`
  runs typecheck, lint, tests and a production build on every push to any branch and on pull requests
  (Node from `.nvmrc`). `npm run typecheck` now runs `next typegen` first, since a fresh clone has no
  route types (`PageProps`) until then. Results show next to each commit/PR on GitHub. `main` is protected
  so only pull requests with passing Checks can be merged (see "Working together").
- **Moderation of shared decks, built and tested (2026-10-06, branch `feature/deck-moderation`)** —
  roadmap phase 4's "reporting/moderation". **Reporting**: on `/shared/[id]` a "Report this deck" form
  (`ReportDeck.tsx`): reason (illegal, copyright, abusive, adult, spam, other) + optional note ≤ 1000 chars.
  Must be signed in (signed-out visitors are pointed to sign in or to `CONTACT_EMAIL`); one report per
  learner and deck version; authors can't report their own deck; the author is never told who reported.
  Table `deck_reports` (a trigger copies the deck's title and author in, so a report stays readable if the
  deck is deleted). **Acting**: `/admin/reports` (`AdminReportsView.tsx`, not indexed; non-moderators just see
  "this page doesn't exist"; moderators also get a "Moderation (n open)" link on the account page): open
  reports with **Hide deck** (a reason is required, and the author sees it) or **Dismiss report**, plus the
  list of hidden decks with **Restore deck**. Hiding sets `published_decks.hidden` on **all versions** of
  the deck; hidden decks vanish from Discover and from `/shared/<id>` for everyone except the author
  (sees "removed because …" on the shared page and in the deck's share panel, publishing is blocked) and
  moderators. People who already copied a deck keep their copy (it's an independent user deck). The author
  can't get around it: authors can't delete a hidden deck, and a trigger (`block_hidden_republish`) refuses
  new versions of a hidden deck. **Who is a moderator**: table `public.admins` (no API access; add people
  in the Supabase SQL editor: `insert into public.admins (user_id) select id from auth.users where email =
  '<email>';`), checked by `public.is_admin()`; all permissions are enforced by row-level security, the
  UI checks only decide what to show. `deck_reports` is in `EXPORT_TABLES` (reports a learner made).
  **Schema changed — `schema.sql` was re-run (Erik) and he was added as the first moderator on 2026-10-06; re-run it again in any other Supabase project** (it also replaces the
  old "publicly readable" select policy on `published_decks`; until it's run the report form errors and
  Discover keeps working through the old policy). Deliberately not built: email alerts for new reports
  (check the page, or add a Supabase webhook + Resend later), automatic hiding after N reports, banning
  repeat offenders, an appeal form (appeals go to `CONTACT_EMAIL`), reports about profiles/usernames/photos.
  Meant to satisfy the Digital Services Act basics: an easy way to notify us, and a stated reason to the
  affected author. The terms of use (`/terms`, merged from `feature/legal-pages`) cover what users may publish and
  that we may remove decks; its "Reporting content" section tells people to email a link, so mention the
  in-site Report button there next time the legal text is edited.

- **Start page next step (2026-10-06, branch `feature/start-page`)**: the landing hero's main button is now
  **Study now** (`NextStep` in `LandingView.tsx`): to `/library` when the learner has saved or created decks,
  otherwise to `/discover`, with a line saying which. The 10-countries demo became a small "New here?" link,
  shown only to people without decks. The header's **Library tab is highlighted** (`.tab-highlight`, see
  the due-dates entry for its current look), except while you're on it.
- **Share previews (2026-10-06, branch `feature/share-previews`)**: pasting a link into WhatsApp, Instagram,
  iMessage, Discord, ... shows a title, description and picture (Open Graph + Twitter tags). `metadataBase`
  is `https://bluememo.eu` (`lib/og/meta.ts`, which also has `pageMetadata()` — a page's `openGraph` replaces
  the layout's rather than merging, so always go through it). Pictures are 1200×630 PNGs drawn by
  `ogCard()` (`lib/og/card.tsx`): `app/opengraph-image.tsx` for every page, official decks
  (`decks/[deckId]/opengraph-image.tsx`, built at build time), and published decks
  (`shared/[id]/opengraph-image.tsx`: title, card count, "shared by <username>", fetched server-side with
  an anonymous Supabase client in `lib/og/publishedDeckSummary.ts`). Learners' own decks are private, so
  their links get the general picture. Preview text is English (server-rendered, before the visitor's
  language is known). Apps cache previews: to see a change, use a new link (e.g. add `?v=2`) or
  Facebook's Sharing Debugger (which also refreshes WhatsApp/Instagram).
- **Visitor statistics + problem reports (2026-10-06, branch `feature/analytics-errors`)** — so the test
  group's problems reach the team:
  - **Problem reports** (`problem_reports` table in `schema.sql`, `lib/problemReports.ts`): browser errors
    nobody caught (`src/instrumentation-client.ts`), pages that crash (`app/error.tsx`, which also shows
    "Try again" + report), server errors (`src/instrumentation.ts`, `onRequestError`), and messages from
    **Report a problem** (footer link + crash page, `ReportProblem.tsx`). Each has kind, message,
    detail/stack, path (never the query string), browser, site version (commit) and the user id when
    signed in. Production only for automatic ones; max 5 per page load, deduped; extension/cross-origin
    noise ignored. Anyone may insert, only the team reads (Supabase table editor) — learners can read
    their own, and they're in "Download my data". Kept 90 days (an insert trigger deletes older rows).
    **Requires re-running `schema.sql`** — until then reports fail quietly, "Report a problem" says it
    couldn't send; "Download my data" leaves the table out (`optional` in `EXPORT_TABLES`).
  - **Visitor statistics**: Vercel Web Analytics (`@vercel/analytics`, `SiteAnalytics.tsx`) — cookieless,
    nothing stored on the device, so still no consent banner. Query strings dropped and own-deck ids masked
    before sending. **Must be switched on in Vercel** (project → Analytics → Enable); until then the script
    just isn't served. Hobby plan: page views only, no custom events.
  - Privacy policy updated (new "Visitor statistics and problem reports" section, legal basis 6.1 f).
- **Branded account emails (2026-10-06, branch `feature/email-templates`)**: `supabase/email-templates/`
  holds confirm sign-up, reset password, change email and magic link as BlueMemo-styled HTML (logo,
  brand blue button, light colours for email apps), each in **Swedish and English** in one template, picked by
  the account's user metadata `lang` (Go template `{{ if .Data.lang }}{{ if eq .Data.lang "sv" }}`). The site
  sets `lang` at sign-up and `AuthSync` updates it when a signed-in learner's site language differs.
  **Not live until pasted into Supabase** (Authentication → Emails; subjects + steps in that folder's
  README) — Erik's dashboard. Next step worth doing: a custom SMTP sender on bluememo.eu (Supabase's
  default sender is generic and rate-limited).
- **Legal pages (2026-10-06, branch `feature/legal-pages`)**: `/privacy` (privacy policy), `/terms` (terms of
  use) and `/legal` ("Who runs BlueMemo"), one data-driven `LegalView.tsx` with the texts in i18n `legal`
  (`**bold**`, `[label](/path)` links and `{email}` → `CONTACT_EMAIL`, via `renderLegal`). A `SiteFooter`
  links them on every page except the study screens. The sign-up form and the share panel link the terms.
  What the texts commit us to: no analytics/ads/tracking, only necessary cookies (so no cookie banner),
  minimum age 13, legal basis "contract" (GDPR 6.1 b), Supabase in the EU (Ireland) + Vercel as processors,
  publishing grants every user the right to view, copy and keep a copy for personal non-commercial study,
  Swedish law. **If any of that stops being true (adding analytics, a newsletter, a new provider, a new kind
  of data), update the policy texts and their `updatedDate` in the same change.** Written by us, not a
  lawyer — worth a review before public launch. Not included on purpose: a postal address (the Swedish
  e-commerce law asks for one from services "normally provided for remuneration"; add it, and an
  organisation number, once there's a company or payments).
- **Plan: offline use + sync between devices (decided 2026-10-06: later, not before the soft launch)** —
  the goal is studying while offline and having progress sync to the account when the connection returns.
  What exists today: signed-in changes apply in memory first and save to Supabase in the background
  (`lib/srs/store.ts` queues writes; `useSrsStatus() === "error"` flags a failed save), and every device
  that signs in loads the account's data from Supabase, so progress already follows the account **while
  online**. What's missing: failed writes are not kept and retried (reloading loses them), the site isn't
  usable offline (no service worker/cache), and an already-open second device doesn't refresh until reload
  (last write wins). When we build it: persist a queue of pending writes locally, replay it when the
  browser is back online, and refresh data when a tab regains focus.

- **Change email, built (2026-10-05, branch `feature/change-email`)** — last of the GDPR trio. The account
  details have an "Email" row with "Change" (`EmailEditor` in `AccountDashboard.tsx`): enter the new
  address → `auth.updateUser({ email }, { emailRedirectTo: <origin>/auth/callback?next=/account })`; Supabase
  emails confirmation links and the address only changes once confirmed (the page says so). Errors: same
  address, already used by another account (`email_exists`), generic. The existing auth callback route
  already completes these links, no new route. **Supabase setting that matters**: Authentication →
  Providers → Email → "Secure email change" (default on) requires confirming from **both** the old and the
  new address; the page's hint text describes that, so **if you turn the setting off, update
  `emailChangeHint`/`emailChangeSent` in en.ts + sv.ts**. Confirmation links must be opened in the browser
  that requested the change (PKCE), same as sign-up links. No schema change; `profiles` doesn't store the
  email, so nothing else to update. **Tested end to end 2026-10-05**: both emails arrive (from
  `no-reply@bluememo.eu`), the address changes after both are confirmed. After sending, the page shows a
  4-step "check both inboxes" box (`emailSent*` keys, `.email-steps`) saying who emailed whom, to click both
  links in the same browser, and that the address stays unchanged until both are confirmed.
- **Custom email sending is live (2026-10-05)**: Supabase's built-in sender allowed only a few emails per
  hour for the whole project (change-email testing hit "Too many emails have been sent"), so auth emails
  now go through **Resend** (free tier ≈ 100 emails/day, 3,000/month; EU region) over SMTP. Domain
  `bluememo.eu` is verified in Resend via DNS records added at Namecheap Advanced DNS (a `resend._domainkey`
  TXT, CNAMEs `rsend` and `send`, optional `_dmarc` TXT); the existing Vercel `A @` and `CNAME www`
  records are untouched. Supabase → Authentication → Emails → SMTP: sender `no-reply@bluememo.eu` / name
  BlueMemo, host `smtp.resend.com`, port 465, user `resend`, password = a Resend API key (a secret: it
  lives only in Supabase, never in the repo or chat; make a new one if it leaks). Supabase email rate limit
  raised to 300/hour (Authentication → Rate Limits). Receiving is off (`no-reply@` can't get mail).
  Upgrade Resend's plan when sign-ups outgrow 100/day. Email wording is still Supabase's default templates —
  branded English/Swedish templates (Authentication → Email Templates) are a possible follow-up.
- **Export my data, built (2026-10-05, branch `feature/export-data`)** — second of the GDPR trio. A
  "Download my data" button in the account page's details builds one JSON file in the browser
  (`lib/exportData.ts`, `ExportData` in `AccountDashboard.tsx`): account id/email/created date, row counts
  per table, and every row the learner owns from `EXPORT_TABLES` (profile incl. avatar, decks, saved decks,
  deck overrides, settings, per-deck SRS settings, card schedules, full review log, test results, decks they
  published, copies they added). Uses the normal signed-in client, so row-level security already limits it
  to their own rows (`published_decks` is publicly readable, hence the explicit `author_id` filter). Pages
  through 1000 rows at a time with no cap, and **fails loudly** if any table can't be read rather than
  handing over an incomplete export. **When a new table holding learner data is added to `schema.sql`, add
  it to `EXPORT_TABLES`** (and make sure account deletion covers it: `on delete cascade` from `auth.users`).
  No schema change. Guests have nothing server-side; their data stays in their browser.
- **Account deletion, built and tested (2026-10-05, branch `feature/delete-account`)** — first of the GDPR
  trio (then export my data, change email). Signed-in users get a "Delete account" row in the account
  page's details; it expands to a warning plus "type your username to confirm". It calls the Postgres
  function `public.delete_my_account()` (end of `supabase/schema.sql`: `security definer`, executable only by
  signed-in users, deletes only `auth.uid()`'s row in `auth.users`). **Why a DB function, not an API
  route**: removing an auth user normally needs the service-role *secret* key on the server; the function
  avoids ever putting that in Vercel. Everything the user owns goes with them because every table references
  `auth.users` with `on delete cascade` (decks, saves, results, settings, SRS data, profile, published decks
  and their copy records). Decision: shared decks are deleted too; copies others already added stay (they
  are independent user decks). **Requires re-running `schema.sql`**; until then the button shows "isn't set
  up on the server yet". After deleting, the browser signs out locally and reloads `/`. Tested end to end on
  2026-10-05 with a throwaway account: deleted, signed out. `schema.sql` was re-run for it.
- **Memory Tree, card dates, no learn-ahead (2026-10-05, same branch; whole branch merged to `main` 2026-10-05)**: a fourth header tab, **the
  Memory Tree** (`/skills`, `SkillTreeView.tsx`, structure in `lib/skillTree.ts`, texts in i18n `skills`):
  five root skills (visualise, associations, memory palace, active recall, spaced repetition) and eight
  branches (numbers, geography, languages, names and faces, lists, texts, playing cards, studies) whose
  skills build top-down. Most skills are empty ("Coming soon") on purpose — add content, then its `href`.
  Other names considered: Teknikträdet, Minnesakademin, Färdigheter, Palatsskolan. Cards now get
  `createdAt` (card form, deck creator, import; older cards have none) shown as "Created" in Browse and
  the card browser and used by the created sort. `LEARN_AHEAD_MS` is 0: a card answered Again comes back
  after its full wait (the session shows a countdown) instead of immediately.
- **Pictures and colours (2026-10-05, same branch)**: 25 ready-made profile pictures (`lib/avatars.ts`,
  drawn memory-palace motifs in `components/AvatarArt.tsx`) — pick one on the account page ("Choose a picture"; stored as
  `avatar:<id>` in `profiles.avatar_url`), and anyone without a picture gets one chosen from their user id
  (`Avatar`'s `seed`). Counts everywhere read learning → due → new; the deck page shows them in the study
  colours. Grade colours are stronger and Hard is orange (`--srs-*` tokens, same in light and dark).
- **Simplification round (2026-10-05, branch `change-flashcards-and-library-looks`)** — supersedes parts of
  the entries below (chapters, practice buttons, per-deck SRS overrides, review limit):
  - **Chapters removed** entirely (`lib/chapters.ts`, the deck page's chapter list, the setting).
  - **Studying a deck = spaced repetition.** The deck page lost "Start practising", "Jump to revision"
    and the final test; it shows an overview (total, due now, learned, unseen, new today) and **Study
    now** (switches spaced repetition on for the deck if needed, then `/decks/<id>/review`). The guided
    practice (walkthrough → revision → test) is kept **only as the landing page's demo**
    (`/decks/<id>/practice`, no `?mode=` / `?chapter=` any more).
  - **Settings model** (`lib/srs/core.ts`): named **presets** (`settings.presets`, the first is "default"
    and can't be removed) hold the FSRS options (desired retention, Again/Hard steps, relearning steps for
    lapses, maximum interval); each deck has `deckOverrides[id] = { presetId?, newPerDay?, examDate? }`;
    `settingsForDeck()` flattens that into `EffectiveSettings`. **No daily review limit** any more; new
    cards per day is per deck (default in `settings.newPerDay`). `normalizeSettings` upgrades older saved
    settings (top-level options → default preset; a deck's old custom options → a preset of its own).
  - **Deck settings** (`/library/settings?deck=<id>`): Studying (new cards/day, exam date), Advanced
    (behind a button: which preset), Share (`SharePanel`, own decks only — copies get the deck's preset
    options and new/day as a preset of their own), Export (`lib/exportDeck.ts`: .txt tab-separated, which
    the importer reads back, or .csv), Edit deck / Delete (own) or Remove from library (saved). Without
    `?deck=`: defaults, preset manager, personal FSRS.
  - **Library**: only a settings gear per deck (no Edit, no ★ Saved, no route/associations tag); one list.
  - Card tables are one line per row (cut with "…"); counts read "New: 5"; 22 achievements, shown after
    "View achievements"; section tabs become a fixed side menu on wide screens (`PageTabs`, CSS only).
- **Minimal study view, card tables, sharing options (2026-10-05, third round)**:
  - **Study screen** (practice revision/test and spaced-repetition review): no box around the card, just
    the question in smaller text and the answer underneath once shown (`.study-card`); no generic labels
    ("What's the answer?" etc. — a deck's own test question is still shown); no "Spaced repetition" badge
    or deck heading on top (the deck title sits small next to Exit). Everything else is in a fixed
    **bottom bar** (`StudyBar` in `PracticeSession.tsx`): the blue/red/green counts (review), Hint + Show
    answer, then the grade buttons, plus Undo / Bury / Add / Edit and a **Keyboard shortcuts** list (also
    **?**); the old always-visible key hints are gone. The card fills the space above the bar, so the
    page only scrolls for long cards.
  - **Deck page "What's inside"** is now a table like the card browser (`DeckCardsTable.tsx`), and both
    sort with one menu (`CardSortSelect`, logic in `lib/cardSort.ts`): due soonest/latest, A–Z/Z–A,
    created oldest/newest. Cards have no timestamps; deck order is creation order.
  - **Discover**: the Type filter also offers Official / Community; a Sort menu: most popular (copies),
    A–Z, Z–A, newest, oldest (official decks keep their order except for A–Z/Z–A). Community decks show
    the creator's profile photo and copy count.
  - **Publish options** (`SharePanel.tsx`): show in Discover, show my profile photo, include my settings
    for this deck (spaced-repetition options + chapters; the exam date is never published). A copy starts
    with those settings. Popularity = copies: `published_deck_copies` (one per learner and version) with
    a trigger keeping `published_decks.copy_count`; the `published_decks_latest` view adds
    `total_copies` across versions. **Schema changed again** — `schema.sql` must be re-run (Erik), which
    also covers the earlier sharing tables.
  - Import recognises a "Minnesbild" column. A French glossary (31 words, with memory cues) was made as an
    importable file for David (not part of the repo).
- **Study tools, quick add, stats round (2026-10-05, second round)**:
  - **Shortcuts while studying** (practice revision/test and spaced-repetition review): **U** undo,
    **−** bury until tomorrow (review only — practice has no schedule), **A** add a card, **E** edit the
    current card, **Tab** hint (the card's *memory cue*; in tests the association object; for ordered
    revision only the first letter, since the cue *is* what's asked). Visible buttons too (`StudyTools`,
    `memoryHint` in `PracticeSession.tsx`). Practice undo = the reducer's `restore` with a history of
    earlier states; review undo/bury = `SrsChange` from `reviewCard`/`buryCard`, reverted by
    `undoSrsChange` (`lib/srs/store.ts`), whose DB writes go through one queue (`enqueue`) so an undo's
    delete never overtakes the insert. Burying a new card stores it as state New with a future due date,
    which `classify` treats as "not today". Add/Edit open `CardDialog` (`components/CardForm.tsx`), which
    always saves the **whole** deck (`useAnyDeck`), never a chapter slice. DeckGate no longer remounts a
    session when the card count changes, so adding a card mid-session keeps your progress.
  - **Quick add** (`/library/add`, `QuickAddView.tsx`; **A** in the Library, **B** opens the card
    browser): choose the deck, save, and a fresh empty card appears until you press Done. Remembers the
    last deck (`localStorage` `quickAdd.deck`).
  - **Due dates**: a card can have its own "learn by" date (`Card.dueBy`) and a deck an **exam date**
    (per-deck setting `examDate`); `applyDeadline` pulls any review that would land later forward to the
    day before the earliest of the two (`deadlineFor`), also in the answer-button previews.
  - **Chapters are opt-in** now: per-deck setting `chapters` (default off), `hasChapters(deck, enabled)`;
    the deck page hints at it for decks over 10 cards.
  - **Per-deck settings** (`/library/settings?deck=<id>`, titled "Deck settings"): chapters + exam date
    (always the deck's own) and the spaced-repetition options (follow defaults, or "own settings"). Reached
    from a gear on every deck in the Library and a "Deck settings" button on the deck page. All of it lives
    in `settings.deckOverrides` (`lib/srs/core.ts`, keys `SRS_OPTION_KEYS` + `DECK_ONLY_KEYS`) — no schema
    change. The list offers every library deck, not only ones with spaced repetition on.
  - **Statistics + achievements** on the account page (`StudyStatistics` in `AccountDashboard.tsx`, pure
    logic in `lib/studyStats.ts`, all-time history via `useStudyHistory`): reviews, different cards,
    retention (share of *due* reviews not answered Again, all time and last 30 days), cards in long-term
    memory (interval ≥ 21 days), average test score, days studied; ten achievements with progress bars.
    Accounts only (that's where the history is).
  - Smaller: deck description is optional; the About page has a "Contact us" section with
    memoblue.team@gmail.com (`CONTACT_EMAIL` in `AboutView.tsx`); "memory queue" was a mistranslation
    and now reads "memory cue" / "minnesbild" everywhere visible; link-styled buttons are no longer
    underlined; the header gear is a drawn icon (`GearIcon.tsx`) since ⚙ is missing from some fonts.
  - Reported bug "a button covers text" in the FSRS optimisation section: couldn't be reproduced (no
    overlap found at desktop or phone width); spacing there was tightened up. Ask for a screenshot if
    it's still seen.
- **Ten-point change round (2026-10-05)** — asked for by the team, decided via a questionnaire (unanswered
  questions got the recommended default, listed here):
  1. **Big reveal cards**: revision rounds, the test and spaced-repetition reviews now use one large card
     (`FlipCard` in `PracticeSession.tsx`, CSS `.reveal-card`) that fills the space between the progress
     bar and the buttons; the question stays visible at the top and the answer appears underneath (click,
     Enter or Space). The 3D flip is gone, and the reducer's `flip` now only reveals (no hiding again).
  2. **Thought bubbles no longer move the card**: in a deck where any card has a bubble, every walkthrough
     step keeps the bubble's headroom (`WalkStep`).
  3. **Logo**: see the rebrand entry below — now an open doorway into a fairy-tale night (blue castle
     with crenellations, three yellow stars), chosen from several rounds of sketches.
  4. **China card**: both chopsticks now stand, fanned, in the same shoe (`Illustration.tsx`).
  5. **Landing headline**: "Memorize the ten most populated countries *in one go.*" / "Lär dig världens
     tio folkrikaste länder *på en gång.*"
  6. **Search + sharing in Discover** (roadmap phase 4, first part): search box (title, description, card
     text, creator's username) + language and type filters; official decks are filtered in the browser,
     community decks are queried from Supabase. Learners publish **their own** decks from the deck page
     (`components/SharePanel.tsx`, signed-in only): each publish adds an **immutable version** to
     `published_decks`; "Show in Discover" on/off (off = link only, via `/shared/<id>`); unpublish removes
     all versions. `/shared/[id]` (`SharedDeckView.tsx`) shows a version (with a link to a newer one) and
     "Add a copy to my library" (a normal user deck, independent of later versions). Not built yet: saving
     a published deck *by reference* (only copies); reporting/moderation was added 2026-10-06 (see top).
     Code: `lib/publishedDecks.ts`. Schema (`published_decks` table + `published_decks_latest`
     view) was re-run 2026-10-05; without it Discover says community decks aren't available and the
     share panel says sharing isn't available.
  7. **Spaced repetition settings moved to the Library** (`/library/settings`, `SrsSettingsView.tsx`;
     linked from the Library page, each deck's SRS panel with `?deck=<id>`, and the account page) — the
     header gear is now general settings (8). New-card waits: **Again 5m, Hard 10m** (settings `againStep`
     / `hardStep`), while **Good and Easy graduate straight to FSRS** (a custom ts-fsrs learning-steps
     strategy, `newCardSteps` in `lib/srs/core.ts`); relearning stays 10m. **Per-deck settings**: the
     defaults apply to all decks and a deck can override any of them (`settings.deckOverrides`, stored
     inside the existing `user_settings.srs` JSON — no schema change; `settingsForDeck()` everywhere).
     **Personal FSRS optimisation** (accounts only — guests keep just 30 days of reviews): "Optimise now"
     plus automatic re-optimisation (on by default) after every 200 new reviews, at most once a day per
     browser, needing at least 200 reviews (`lib/srs/optimize.ts`). The browser sends only per-card
     [rating, day number] lists to the stateless route `app/api/fsrs/optimize/route.ts`, which runs the
     official optimizer `@open-spaced-repetition/binding` (a native Rust addon — listed in
     `serverExternalPackages` in `next.config.ts`) and returns the 21 parameters, saved as
     `settings.parameters`. Old `learningSteps` settings are ignored (replaced by the two new fields).
  8. **General settings** (`/settings`, `SettingsView.tsx`): theme (dark default / light / match
     device), text size, reduce motion, and the library's layout (tiles / rows / list, sort: recent /
     recently studied / most due / name, grouping: own vs saved / together / by type), with a quick
     tiles/rows/list switch on the Library page. **Per device, in browser storage** (`lib/preferences.ts`,
     key `prefs.v1`), like most sites' theme settings — not synced to accounts. `lib/themeScript.ts` is an
     inline `<head>` script that applies the theme before first paint (no flash of dark for light users).
  9. **Anki**: nothing visitor-facing mentioned it any more (checked site text and the built JS);
     internal comments are fine per the rule below.
  10. **Memory techniques page** (`/techniques`, `TechniquesView.tsx`): the memory palace, active recall and
      spaced repetition, each with what it is, how to do it and how BlueMemo uses it; the landing page's
      "Why it works" section became three cards linking to each section.
- **Rebrand + landing page (2026-10-05)**: brand decided with the team via a questionnaire — audience
  high-school/university students and language learners, Sweden first, found via TikTok/Instagram/YouTube
  and word of mouth; personality calm, smart, trustworthy ("between Anki's complexity and Quizlet's
  playfulness"). Result: **ink & paper, dark-first** (dark is the default for everyone; the light palette
  exists under `:root[data-theme="light"]` but nothing switches to it yet — an appearance setting would);
  **one brand blue, no orange** (the earlier orange accent/spark was dropped on purpose); **Newsreader**
  for h1/h2 and the wordmark, **Geist** for everything read while studying; no mascot; simple line icons.
  Logo (updated 2026-10-05): an open doorway (paper-coloured frame + threshold) into a dark-blue night
  with a crenellated blue castle and **three yellow stars** — the stars are logo artwork, the UI still uses
  one blue; wordmark
  "**Blue**Memo" with "Blue" in brand blue. `/` is now a landing page (`components/LandingView.tsx`)
  whose main button starts the "10 largest countries" practice as a demo (no account needed); the logo
  links to `/`, decks stay on `/discover`. Copy avoids claims we can't back up (no "in one minute", no
  made-up testimonials). Idea not done yet: a Swedish demo deck, since the site defaults to Swedish for
  Swedish browsers but both official decks are in English.
- **Repo moved to a GitHub organisation (2026-10-04)**: `ErikNyabako/Memory-app` →
  **`BlueMemo/Memory-app`** (public, branch `main`). Done so the Vercel project, which lives on the other
  partner's Vercel account, can import it — Vercel only lists repos owned by a GitHub account or org
  that account has linked, and only the repo owner can install its GitHub app. Both partners are org
  owners. The old URL redirects, so existing clones still work, but update the remote on each machine:
  `git remote set-url origin https://github.com/BlueMemo/Memory-app.git`.
  **Vercel**: the project (`bluememo`, on the partner's Vercel account, domain **bluememo.eu**) was
  first deployed by uploading a folder from a local computer (the Vercel Source tab listed gitignored
  files, and the deployed commit `2169478` never existed on GitHub), so pushes weren't deploying. It is
  now connected to `BlueMemo/Memory-app`, branch `main` (Settings → Git), so each push to `main` deploys.
  That other computer may hold a local-only commit (`2169478`, "Rename site to Blue Memo…") — it must
  `git pull` and merge before it pushes, since it touches the same files as `29b38c3`. Caveats: Vercel's free Hobby plan only deploys *org-owned* repos while
  they're public (private org repos need Pro), and Hobby is meant for non-commercial use — plan on a
  paid team before launch. The repo being public means source comments (including ones naming Anki)
  are readable by anyone; the "never name Anki" rule only covers what visitors see on the site.
- **Account page rebuilt (2026-10-04)**: signed-in `/account` used to be just email + username + sign-out.
  It's now `components/AccountDashboard.tsx` (signed-out sign-in/up forms stay in `AccountView.tsx`):
  profile head with **avatar** (upload, change, remove) and member-since date; "at a glance" tiles (decks
  created, cards, due today, tests taken); a **streak** (current, best, active days) with a 15-week
  **heatmap**; recent activity (tests with their score + reviews rolled up per day); and account
  details (change username, change password, links to study options and the library).
  - *Left out at first, now built (2026-10-05)*: change email, delete account and export my data — see the
    three entries above (GDPR; we're EU-based).
  - *Streak/heatmap data*: `lib/accountActivity.ts` queries `srs_review_logs` (timestamps only, paged,
    120-day window) and `practice_results`; `lib/activity.ts` is the pure, tested logic. Both reviews and
    finished tests count as study. Days use the same 4 am rollover as spaced repetition. The 120-day
    window caps how long a streak can show. Only today's review log is held in memory by `srs/store.ts`,
    which is why this fetches its own history rather than reusing it.
  - *Avatar storage decision*: a ~160px centre-cropped JPEG kept as a **data URL in `profiles.avatar_url`**
    (≈10 KB), not a Supabase Storage bucket — no bucket/policies to set up and nothing to test blind. The
    column has a length cap (60k chars) since profiles are publicly readable. **If profiles ever get
    listed in bulk (phase 4 sharing), move photos to Supabase Storage** so those lists stay light.
  - *Done 2026-10-05*: `schema.sql` re-run (adds `profiles.avatar_url`). Before that everything else on
    the page works, `useUser()` falls back to selecting just the username, and saving a photo shows an
    error instead of silently doing nothing.
  - `useUser()` now returns `avatarUrl` too, and `notifyUsernameChanged` became `notifyProfileChanged`
    (called after changing a username or photo so the header updates). Password change uses
    `auth.updateUser` with no "current password" prompt — Supabase doesn't require one by default.
- **Chapters of 10 for big decks, added (2026-10-01)**: decided by the team (resolves the earlier open
  "large decks" question). Decks with more than 10 cards (`CHAPTER_SIZE` in `src/lib/chapters.ts`) are
  learned chapter by chapter: each chapter gets the full technique flow, the deck page lists chapters
  (Learn / Revise per chapter, `?chapter=N`), and a **Final test** covers all cards (`?mode=test`).
  Stop numbers continue across chapters (chapter 2 starts at stop 11) via `positionOffset` in
  `PracticeSession`; authors' notes move with their cards. The last chapter can be shorter. A chapter's
  test results offer "Next chapter →". FSRS reviews are unaffected (whole deck). Not tracked yet: which
  chapters a learner has finished.
- **Import v1, added (2026-10-01)**: `/library/import` (linked under "+ Create new deck" in the Library).
  Paste text or upload/drop a .txt/.csv/.tsv (max 5 MB, read in the browser, never uploaded). Parsing is
  in `src/lib/import/parse.ts` (tested): auto-detects the separator (tab ; | → = " - " ": " ,), quoted CSV
  via Papa Parse, Anki's "Notes in Plain Text" export (reads its `#separator/#columns/#html/#deck column`
  header lines, ignores deck/notetype/tags/guid columns, strips HTML and decodes entities with the
  `entities` package), strips list numbering, guesses a header row and each column's role
  (question/answer/memory queue/note/ignore). A list without separators suggests a **memory route**;
  with a question column, **associations**. Preview table: change column roles, skip rows, edit cells;
  rows without an answer (or question, for associations) are skipped, duplicates and very long fields are
  flagged. Up to 5,000 cards; guests get a warning for decks that may not fit browser storage.
  **Next (v2)**: direct .apkg import (zip + sql.js, field mapping, cloze skipped) — for now .apkg files
  get a message pointing to Anki's plain-text export. Later: Anki review history → FSRS, media,
  "add cards from import" to an existing deck.
- **Saved decks behave like the learner's own decks, added (2026-10-01)**: decision from the team — "there
  should be no difference between saved and independently created decks". Saved decks appear in Browse
  cards, and can be edited there or in the deck editor (Edit button on the deck page and Library tile).
  Because official (and later shared) decks belong to everyone, editing one stores a **personal version**
  for that learner (`src/lib/deckOverrides.ts`; guests: localStorage `library.deckOverrides`, accounts:
  table `deck_overrides`) under the original deck's id, so ★ Saved and its FSRS schedule stay attached.
  Everyone else still sees the original. Until edited, a saved deck follows the original (incl. fixes);
  once edited, later changes to the original don't reach it — consistent with the earlier decision that
  publisher updates don't affect personal copies. "Reset to the original" on the deck page discards the
  personal version. Shown with an "Edited" tag in the Library/deck page; Discover always shows the original.
  `src/lib/editableDecks.ts` (`useEditableDecks`, `saveEditedDeck`) is the one place that decides where an
  edit goes; `components/DeckGate.tsx` (replaces UserDeckGate) picks the right version for deck, practice
  and review pages. The deck editor and its card form now keep fields they don't edit (an official deck's
  notes/test questions/instructions; a card's object/details/suggestion/drawing). Editing an unsaved
  official deck via its URL saves it to the library. **Pending**: re-run `supabase/schema.sql` (adds
  `deck_overrides`; until then signed-in edits to saved decks only last until the page reloads).
- **Spaced repetition (FSRS, as in Anki), added (2026-10-01)**: built on `ts-fsrs` (the official
  open-spaced-repetition TypeScript implementation). Modelled on Anki's defaults and behaviour: four
  answers (Again/Hard/Good/Easy, keys 1-4, Space = Good once the answer shows), learning steps `1m 10m`,
  relearning `10m`, desired retention 0.90, max interval 36500 d, fuzz on, 20 new/day and 200 reviews/day
  *per deck*, a day that rolls over at 4 am, no learn-ahead (cards wait their full step, changed 2026-10-05), button labels showing the next
  interval (unfuzzed, like Anki). Queue order: due learning cards → due reviews → new cards (in deck
  order, shown after reviews — Anki's "mix" order isn't implemented) → learning cards within learn-ahead.
  - Code: `src/lib/srs/core.ts` (pure scheduling rules, tested in `core.test.ts`), `src/lib/srs/store.ts`
    (data: guest → localStorage key `srs.v1`, signed in → Supabase; writes apply in memory first and save in
    the background, failures surface via `useSrsStatus() === "error"`), `components/ReviewSession.tsx`
    (`/decks/[id]/review`), `SrsDeckPanel.tsx` (on/off switch + counts on deck pages), `SrsSettingsView.tsx`
    (`/library/settings`), `lib/srs/optimize.ts` (personal parameters), `CardBrowserView.tsx` (`/library/cards`).
  - Scheduling is stored per (deck id, card id), separately from deck content, so it works for official
    decks too, and editing a card keeps its schedule (card ids never change). Deleting a deck removes its
    scheduling; deleting a card in the browser "forgets" it.
  - Per-deck switch, default from the setting **"Use spaced repetition for new decks"** (on by default);
    the deck creator's details step has a checkbox that starts from that default. Official decks start off.
  - The spaced-repetition review is separate from the technique practice (walk-through → revision → test);
    they don't feed each other yet. Possible follow-up: count a passed technique test as a first review.
  - **Card browser** (Library → "Browse cards"): all cards in the learner's own decks; search, deck and
    state filters, sortable columns; edit prompt/answer/memory queue/note, see FSRS state, **Forget**
    (reset to new, keeps review log), delete (not the last card in a deck). Images are edited in the
    deck editor only.
  - **Pending**: re-run `supabase/schema.sql` in Supabase (adds `user_settings`, `srs_deck_settings`,
    `srs_cards`, `srs_review_logs`). Until then, signed-in users' reviews can't be saved and the review page
    shows an error notice; guest mode works regardless.
  - Not done yet: guest → account import of review history (only decks/saves are imported on sign-in),
    undo of the last answer, FSRS parameter optimisation from a user's own review log (the full log is kept
    in `srs_review_logs` for this), per-deck option presets (one preset applies to all decks).
- **Jump straight to revision, added (2026-10-01)**: the deck page now has a second button next to
  "Start practising" that skips the intro/overview/walkthrough and goes straight into a revision round
  with every card — for a deck you've already learned and just want to test yourself on. Implemented as
  `?mode=review` on the practice route (`initReviewSession` in `practice.ts`, read via the page's
  `searchParams` prop and threaded down through `UserDeckGate` — deliberately not `useSearchParams()`,
  which would have broken static prerendering of the official decks' practice pages). Side effect:
  `/decks/[deckId]/practice` is no longer statically prerendered at build time (now server-rendered per
  request) since it depends on the search param — a deliberate, acceptable trade-off for the feature.
- **Name decided: BlueMemo** — one word, no space (confirmed 2026-10-05; the first live deploy from the
  other computer said "Blue Memo" with a space, which was wrong). History: "Memory App" (a working name)
  until 2026-10-01, then MemoVerse, then BlueMemo on 2026-10-04 when the team settled on it ahead of
  buying a domain. The code rename covers the site's displayed name and page titles (`i18n` `siteName`,
  `layout.tsx` metadata). **The domain is bought and live: `bluememo.eu`**, attached to the Vercel
  project. Still to confirm: Supabase Auth → URL Configuration has Site URL `https://bluememo.eu` and
  `https://bluememo.eu/auth/callback` in Redirect URLs (otherwise sign-up/reset emails from the live
  site break), and the Vercel project has both `NEXT_PUBLIC_SUPABASE_*` env vars. Not renamed: the local
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
- **Deployment is live (updated 2026-10-05)**: hosted on Vercel at `bluememo.eu`, deployed from the
  `main` branch of `BlueMemo/Memory-app` (see the repo/Vercel bullets above). History: the plan was
  Vercel's free tier on a `*.vercel.app` address and a domain later, to avoid locking in a name early;
  the team then settled the name and bought the domain sooner. The reason deploying matters beyond
  "being online": confirmation/reset emails link to wherever the app runs, so they only opened on the
  machine running `npm run dev` until there was a real URL. Whenever the live URL changes, update Supabase
  → Authentication → URL Configuration (Site URL + `<url>/auth/callback` in Redirect URLs), and keep
  `http://localhost:3000/auth/callback` there for local development.
- **Auth method decision**: email + password (with reset), not magic-link — chosen because Supabase makes
  password reset genuinely easy to build (it hosts the email + token verification), and the team wants
  password auth eventually anyway.
- **Guest mode decision**: signing in is optional, not required. Guest mode (browser storage) stays the
  default for anyone who doesn't sign in; an account is an upgrade for cross-device sync, not a gate.
- **Supabase project access (2026-10-05)**: the project belongs to Erik's Supabase account; David's
  Supabase account isn't a member of its organization (CLI login works but sees no projects), so David
  can't run `schema.sql`. Until Erik invites him (Organization settings → Team), Erik runs schema changes.
  **Schema status (2026-10-05)**: Erik re-ran the whole `schema.sql` in Supabase after the BlueMemo merge, so
  every table (incl. `published_decks`, `avatar_url`, SRS and settings tables) exists. **Re-run it whenever
  `supabase/schema.sql` changes.**
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
- Pages (tabs in `SiteHeader`): `/discover` (official + community decks, search), `/library` (saved +
  created decks), `/about`, `/account` (sign in/up), plus `/` (landing page), `/techniques`, `/settings`
  (general, gear icon), `/library/settings` (spaced repetition), `/shared/[id]` (a published deck),
  `/decks/[deckId]`, `/decks/[deckId]/practice`, and `/library/new` / `/library/edit/[deckId]` (the deck creator).
- `src/lib/library.ts` / `src/lib/userDecks.ts`: saved deck ids and created decks. Each hook/mutator
  (`useSavedDeckIds`, `useUserDecks`, `addUserDeck`, ...) checks the active user (set by
  `components/AuthSync.tsx`) and transparently reads/writes Supabase when signed in, browser storage
  otherwise — callers never branch on auth state themselves. Mutators are `async` because the signed-in
  path awaits a network call.
- The About page's "Who we are" text (`about.teamBody`) is the team's story: David and Erik, 19, David's
  work with Jonas von Essen and top grades, Erik from Affärsgymnasiet, the "ultimate platform for
  memorization" vision. Written 2026-10-05 from David's notes.
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
- Styling is plain CSS in `src/app/globals.css` with colour tokens on `:root` (dark, the default) and
  `:root[data-theme="light"]`. Use `--brand-blue` / `--accent` for the one brand colour and
  `--brand-on-blue` for text on it; don't reintroduce a second brand colour.
- The logo artwork lives in `components/LogoArt.tsx` (used by the header `Logo.tsx` and
  `app/apple-icon.tsx`); `app/icon.svg` (favicon) is a static copy of the same drawing — keep it in step.
- **Never name Anki (or any other competing app) in anything a visitor can see** — site text, CSS served to
  browsers, error messages. The spaced-repetition feature is modelled on Anki's behaviour (and the importer
  reads its plain-text export), which is fine internally, so source comments and identifiers like
  `readAnkiHeader` may still mention it, but user-facing wording should say "FSRS", "spaced repetition", or
  "another flashcard app". The importer's help text deliberately doesn't name the app it reads exports from.

## Roadmap (agreed with the team)

1. Practice engine + official decks (done)
2. Guided deck creator and personal library (guest mode, browser storage) (done)
3. Accounts (Supabase) and progress tracking; FSRS scheduling later — **in progress**: sign in/up/out,
   password reset, decks/library synced to accounts, and practice-result recording are all built (see
   Accounts above). Remaining: a UI to actually see your practice history, and FSRS-based scheduling.
4. Sharing: publish decks (published versions are immutable; authors post a new version),
   public list + search, save or "make my own copy" — **in progress**: publish/versions/link-only, search
   and "make my own copy" are built (see Current status); saving by reference and moderation are not.
5. Test-group launch

Large decks: decided — chapters of 10 (see Current status).
