export function SocialCard({ effectCount }: { effectCount: number }) {
  return (
    <div
      style={{
        alignItems: "stretch",
        background:
          "radial-gradient(circle at 12% 0%, rgba(124,92,255,.48), transparent 38%), radial-gradient(circle at 92% 92%, rgba(24,224,216,.25), transparent 38%), #05060a",
        color: "#f5f7ff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
        Ideas <span style={{ color: "#18e0d8", marginLeft: 9 }}>Visualized</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: "-4px",
            lineHeight: 1.02,
          }}
        >
          Effects that make people ask how did they build that?
        </div>
        <div style={{ color: "#aeb5c8", display: "flex", fontSize: 29, marginTop: 30 }}>
          {effectCount} live-tunable Canvas, WebGL, and game-ready visual effects.
        </div>
      </div>
      <div style={{ color: "#7c8498", display: "flex", fontSize: 22 }}>
        ideasvisualized.com · Built by Ideas Realized
      </div>
    </div>
  );
}
