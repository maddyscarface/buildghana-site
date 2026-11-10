import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BuildGhana Abroad — Build in Ghana. Stay in Control From Abroad.";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#12291F", padding: 72, color: "#F7F3EB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#F7F3EB", display: "flex" }} />
          <span>BuildGhana <span style={{ color: "#D6AA64", fontStyle: "italic" }}>Abroad</span></span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 1.02, letterSpacing: -2 }}>Build in Ghana.</div>
          <div style={{ fontSize: 84, lineHeight: 1.02, letterSpacing: -2, color: "#D6AA64" }}>Stay in control from abroad.</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(247,243,235,0.7)" }}>Construction management · Owner&apos;s representation · Project rescue</div>
      </div>
    ),
    size,
  );
}
