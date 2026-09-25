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
- `src/decks/`: official decks as TypeScript data. User decks will come from a database later.
- `src/i18n/`: site text. `en.ts` is the source of truth; `sv.ts` must have the same keys. Deck content has
  its own `language` and is never translated by the site.

## Conventions

- Every piece of user-facing site text goes through `useI18n()`; never hard-code UI strings in components.
- In deck text, `**bold**` marks emphasis and CAPITAL runs in visualizations mark the sound-alike part.
- Styling is plain CSS in `src/app/globals.css` with colour tokens on `:root` (light and dark).

## Roadmap (agreed with the team)

1. Practice engine + official decks (done)
2. Guided deck creator and personal library (guest mode, browser storage)
3. Accounts (Supabase) and progress tracking; FSRS scheduling later
4. Sharing: publish decks (published versions are immutable; authors post a new version),
   public list + search, save or "make my own copy"
5. Test-group launch

Open decision: large decks (50+ cards) will likely be split into chapters of ~10; the engine currently assumes ~10.
