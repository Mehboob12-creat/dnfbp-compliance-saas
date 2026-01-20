// components/TopTabs.js
import Link from "next/link";
import { useRouter } from "next/router";
import { TOP_TABS } from "../utils/ui/tabs";

export default function TopTabs() {
  const router = useRouter();
  const path = router.pathname || "";

  const tabWrap = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(10px)",
  };

  const tabStyle = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 13,
    color: active ? "#0f172a" : "#475569",
    border: active ? "1px solid rgba(15,23,42,0.14)" : "1px solid transparent",
    background: active ? "rgba(15,23,42,0.06)" : "transparent",
  });

  return (
    <div style={tabWrap}>
      {TOP_TABS.map((t) => {
        const active = path === t.href || (t.href !== "/dashboard" && path.startsWith(t.href));
        return (
          <Link key={t.key} href={t.href} style={tabStyle(active)}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
