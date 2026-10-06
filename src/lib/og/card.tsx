import { ImageResponse } from "next/og";
import { LogoArt } from "@/components/LogoArt";

// The picture shown when a BlueMemo link is pasted into WhatsApp, Instagram, iMessage, Discord, ...:
// the logo and wordmark, an optional small line above the title, the title, and a line below it.
// 1200×630 is the size every app crops its previews from. Dark-first, like the site.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BG = "#121417";
const INK = "#ecebe6";
const MUTED = "#9b9fa6";
const BLUE = "#6f9cff";

/** Shortens long text so it never overflows the card. */
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function ogCard({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const long = title.length > 48;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: BG,
          color: INK,
          borderBottom: `14px solid ${BLUE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 64 64">
            {/* Called as a function: ImageResponse only accepts plain SVG elements inside <svg>. */}
            {LogoArt({ frame: INK })}
          </svg>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            <span style={{ color: BLUE }}>Blue</span>
            <span>Memo</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && <div style={{ display: "flex", fontSize: 30, color: BLUE, fontWeight: 600 }}>{clip(eyebrow, 60)}</div>}
          <div style={{ display: "flex", fontSize: long ? 60 : 76, fontWeight: 700, lineHeight: 1.1 }}>{clip(title, 90)}</div>
          {subtitle && <div style={{ display: "flex", fontSize: 32, color: MUTED, lineHeight: 1.35 }}>{clip(subtitle, 130)}</div>}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
