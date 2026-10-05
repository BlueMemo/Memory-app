import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The development badge would otherwise cover the Instructions button in the bottom-left corner.
  devIndicators: { position: "bottom-right" },
  // The FSRS optimizer is a native (Rust) addon; it has to be loaded from node_modules, not bundled.
  serverExternalPackages: ["@open-spaced-repetition/binding"],
};

export default nextConfig;
