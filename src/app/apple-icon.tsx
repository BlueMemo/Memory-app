import { ImageResponse } from "next/og";
import { LogoArt } from "@/components/LogoArt";

// iOS home-screen icon (iOS ignores icon.svg). Same door, castle and stars as the logo; iOS rounds the
// corners itself, so the ink background fills the whole square here.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#121417",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 64 64">
          {/* Called as a function: ImageResponse only accepts plain SVG elements inside <svg>. */}
          {LogoArt({ frame: "#ecebe6" })}
        </svg>
      </div>
    ),
    size,
  );
}
