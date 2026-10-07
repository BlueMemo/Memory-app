import { GearSix } from "@phosphor-icons/react/ssr";

/** The settings gear (Phosphor, the site's one icon family), never a ⚙ character, which some fonts don't have. */
export function GearIcon({ size = 18 }: { size?: number }) {
  return <GearSix size={size} weight="regular" aria-hidden="true" />;
}
