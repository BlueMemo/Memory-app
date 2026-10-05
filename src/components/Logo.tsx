import { useI18n } from "@/i18n";
import { LogoArt } from "./LogoArt";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <LogoArt frame="var(--ink)" />
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
