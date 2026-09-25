import { Fragment, type ReactNode } from "react";

/** Renders **bold** segments as <strong>. */
export function renderBold(text: string): ReactNode {
  return text.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

/** Highlights runs of CAPITALS (the sound-alike part of a visualization), e.g. "a cOLA" or "NEW HOUSE". */
export function renderCapsHighlight(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /[A-Z]{2,}(?:\s+[A-Z]{2,})*/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={m.index}>{m[0]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
