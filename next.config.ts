import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The development badge would otherwise cover the Instructions button in the bottom-left corner.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
