import { computeParameters, FSRSBindingItem, FSRSBindingReview } from "@open-spaced-repetition/binding";

// POST /api/fsrs/optimize: fits personal FSRS parameters to a learner's review history.
// The browser sends only what the optimizer needs, with no card ids or timestamps: for each card, its
// reviews in order as [rating 1-4, day number], where day numbers already use the learner's time zone
// and day rollover. This route is stateless — it stores nothing and needs no sign-in.

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_REVIEWS = 200_000;

type Review = [rating: number, day: number];
interface Body {
  cards: Review[][];
  relearningSteps: number;
}

function parseBody(raw: unknown): Body | null {
  if (!raw || typeof raw !== "object") return null;
  const { cards, relearningSteps } = raw as Partial<Body>;
  if (!Array.isArray(cards) || typeof relearningSteps !== "number") return null;
  let total = 0;
  for (const card of cards) {
    if (!Array.isArray(card)) return null;
    total += card.length;
    if (total > MAX_REVIEWS) return null;
    for (const review of card) {
      if (!Array.isArray(review) || ![1, 2, 3, 4].includes(review[0]) || !Number.isInteger(review[1])) return null;
    }
  }
  return { cards, relearningSteps: Math.max(0, Math.min(10, Math.round(relearningSteps))) };
}

/** One training item per review after a card's first: the card's history up to and including that review. */
function toItems(cards: Review[][]): FSRSBindingItem[] {
  const items: FSRSBindingItem[] = [];
  for (const card of cards) {
    const reviews = card.map(([rating, day], i) => new FSRSBindingReview(rating, i === 0 ? 0 : Math.max(0, day - card[i - 1][1])));
    for (let end = 2; end <= reviews.length; end++) {
      const item = new FSRSBindingItem(reviews.slice(0, end));
      if (item.longTermReviewCnt() > 0) items.push(item);
    }
  }
  return items;
}

export async function POST(request: Request) {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });

  const items = toItems(body.cards);
  if (items.length === 0) return Response.json({ error: "not_enough_data" }, { status: 422 });
  try {
    const parameters = await computeParameters(items, {
      enableShortTerm: true,
      numRelearningSteps: body.relearningSteps,
    });
    return Response.json({ parameters, items: items.length });
  } catch {
    // fsrs-rs refuses (rather than guesses) when the history is too thin to fit.
    return Response.json({ error: "not_enough_data" }, { status: 422 });
  }
}
