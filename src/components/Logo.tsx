import { useI18n } from "@/i18n";

// The BlueMemo symbol: an arched doorway into your memory palace, with the remembered object
// (the blue dot) inside. app/icon.svg and app/apple-icon.tsx draw the same door on an ink tile,
// so change all three together.
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M16 54 V26 A16 16 0 0 1 48 26 V54"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="37" r="7" fill="var(--brand-blue)" />
    </svg>
  );
}

// Symbol + wordmark ("Blue" in brand blue, "Memo" in ink). The split wordmark is logo artwork,
// like an image, so its two halves aren't i18n strings; the accessible name comes from `siteName`.
export function Logo() {
  const { t } = useI18n();
  return (
    <span className="logo" role="img" aria-label={t.siteName}>
      <LogoMark />
      <span className="logo-word" aria-hidden="true">
        <span className="logo-blue">Blue</span>Memo
      </span>
    </span>
  );
}
