import { ImageResponse } from "next/og";

// iOS home-screen icon (iOS ignores icon.svg). Same palace door as app/icon.svg; iOS rounds the
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
        <svg width="132" height="132" viewBox="0 0 64 64">
          <path
            d="M20 52 V31 A12 12 0 0 1 44 31 V52"
            fill="none"
            stroke="#ecebe6"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="32" cy="40" r="5.5" fill="#6f9cff" />
        </svg>
      </div>
    ),
    size,
  );
}
