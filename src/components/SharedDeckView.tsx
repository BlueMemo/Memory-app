"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dictionaries, useI18n } from "@/i18n";
import { fill } from "@/lib/practice";
import { copyPublishedDeck, getPublishedDeck, type PublishedDeck } from "@/lib/publishedDecks";

/** /shared/[id]: a published deck version, opened from Discover or a shared link. */
export function SharedDeckView({ id }: { id: string }) {
  const { t: dict } = useI18n();
  const t = dict.sharedDeck;
  const router = useRouter();
  const [state, setState] = useState<{ status: "loading" | "missing" | "ready"; deck?: PublishedDeck; newerId?: string | null }>({
    status: "loading",
  });
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let live = true;
    void getPublishedDeck(id).then((result) => {
      if (!live) return;
      setState(result ? { status: "ready", deck: result.deck, newerId: result.newerId } : { status: "missing" });
    });
    return () => {
      live = false;
    };
  }, [id]);

  if (state.status === "loading") return <main className="page narrow" />;
  if (state.status === "missing" || !state.deck) {
    return (
      <main className="page narrow">
        <Link href="/discover" className="link-muted">
          {t.back}
        </Link>
        <p className="empty-state">{t.notFound}</p>
      </main>
    );
  }

  const published = state.deck;
  const { deck } = published;
  const ordered = deck.kind === "ordered";

  async function copy() {
    setCopying(true);
    const newId = await copyPublishedDeck(published);
    router.push(`/decks/${newId}`);
  }

  return (
    <main className="page narrow">
      <Link href="/discover" className="link-muted">
        {t.back}
      </Link>
      <div className="tags deck-tags">
        <span className="tag">{ordered ? dict.decks.ordered : dict.decks.unordered}</span>
        <span className="tag">{fill(dict.decks.cardCount, { n: deck.cards.length })}</span>
        <span className="tag">{dictionaries[deck.language].languageName}</span>
        <span className="tag">{fill(t.version, { n: published.version })}</span>
      </div>
      <h1 className="deck-title">{deck.title}</h1>
      <p className="muted published-author">{fill(t.by, { author: published.author ?? t.unknownAuthor })}</p>
      <p className="deck-description">{deck.description}</p>

      {state.newerId && (
        <p className="fine-print">
          {t.newer} <Link href={`/shared/${state.newerId}`}>{t.newerLink}</Link>
        </p>
      )}

      <div className="deck-actions">
        <button type="button" className="btn accent big-btn" disabled={copying} onClick={() => void copy()}>
          {copying ? t.copying : t.copy}
        </button>
      </div>
      <p className="fine-print">{t.copyHint}</p>

      <h2 className="section-title">{t.preview}</h2>
      <ol className="shared-card-list">
        {deck.cards.map((card) => (
          <li key={card.id}>
            {!ordered && card.prompt && <span className="muted">{card.prompt} · </span>}
            <strong>{card.answer}</strong>
          </li>
        ))}
      </ol>
    </main>
  );
}
