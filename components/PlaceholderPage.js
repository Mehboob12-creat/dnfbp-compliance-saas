export default function PlaceholderPage({ title, subtitle, note }) {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 32,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
        {title}
      </h1>

      <p style={{ color: "#475569", fontSize: 15, marginBottom: 20 }}>
        {subtitle}
      </p>

      <div
        style={{
          border: "1px solid rgba(15,23,42,0.12)",
          borderRadius: 16,
          padding: 20,
          background: "rgba(248,250,252,0.85)",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>
          Inspection-safe note
        </div>
        <div style={{ color: "#475569", lineHeight: 1.6 }}>
          {note}
        </div>
      </div>
    </div>
  );
}
