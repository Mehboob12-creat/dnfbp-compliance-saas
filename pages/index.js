import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Home always redirects to login
    window.location.href = "/login";
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc" }}>
      <div style={{ padding: 24, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
        Redirecting to login...
      </div>
    </div>
  );
}
