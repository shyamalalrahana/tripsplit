import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TripSplits trip money manager";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fbff 0%, #f4f0ff 48%, #eaf7ff 100%)",
          color: "#0f172a",
          fontFamily: "Arial, sans-serif",
          padding: 64
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "2px solid rgba(15, 107, 255, 0.12)",
            borderRadius: 48,
            background: "rgba(255, 255, 255, 0.78)",
            boxShadow: "0 36px 90px rgba(15, 107, 255, 0.18)",
            padding: 56
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <div
              style={{
                display: "flex",
                width: 188,
                height: 76,
                alignItems: "center",
                justifyContent: "space-around",
                border: "10px solid #0f6bff",
                background: "#0f6bff"
              }}
            >
              <div style={{ width: 54, height: 54, borderRadius: 999, background: "#ffffff" }} />
              <div style={{ width: 54, height: 54, borderRadius: "0 999px 999px 0", background: "#ffffff" }} />
              <div style={{ width: 54, height: 54, borderRadius: "999px 0 0 999px", background: "#ffffff" }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", color: "#0f6bff", fontSize: 70, fontWeight: 900, letterSpacing: "-3px" }}>
              tripsplits<span style={{ fontSize: 36, letterSpacing: "-1px" }}>.in</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                width: 348,
                justifyContent: "center",
                borderRadius: 999,
                background: "#ede9ff",
                color: "#5b21b6",
                fontSize: 28,
                fontWeight: 800,
                padding: "12px 22px"
              }}
            >
              Trip money, finally clear
            </div>
            <div style={{ display: "flex", maxWidth: 880, fontSize: 78, fontWeight: 900, letterSpacing: "-2px", lineHeight: 0.96 }}>
              Split trips with friends and settle by UPI QR
            </div>
            <div style={{ display: "flex", maxWidth: 820, color: "#667085", fontSize: 32, fontWeight: 600, lineHeight: 1.35 }}>
              Invite friends, track shared expenses, and know exactly who owes whom.
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, color: "#0f6bff", fontSize: 28, fontWeight: 800 }}>
            tripsplits.in <span style={{ color: "#94a3b8" }}>•</span> Trip Money Manager
          </div>
        </div>
      </div>
    ),
    size
  );
}
