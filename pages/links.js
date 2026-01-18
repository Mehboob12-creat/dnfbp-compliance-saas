import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function ImportantLinksPage() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    async function guard() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/login";
        return;
      }
      setMsg("");
    }
    guard();
  }, []);

  const links = [
    {
      title: "Financial Monitoring Unit (FMU) — Pakistan",
      desc: "Primary authority for AML reporting and guidance. Use for official notices, guidance, and reference materials.",
      href: "https://www.fmu.gov.pk/",
      tag: "Official",
    },
    {
      title: "FATF (Financial Action Task Force)",
      desc: "International AML/CFT standards, guidance, and public statements.",
      href: "https://www.fatf-gafi.org/",
      tag: "Standards",
    },
    {
      title: "UN Security Council — Sanctions Lists",
      desc: "UN sanctions lists and related implementation guidance (for screening reference).",
      href: "https://www.un.org/securitycouncil/content/un-sc-consolidated-list",
      tag: "Sanctions",
    },
    {
      title: "NACTA — National Counter Terrorism Authority",
      desc: "Reference authority for domestic listings and related official publications.",
      href: "https://nacta.gov.pk/",
      tag: "Pakistan",
    },
    {
      title: "SECP — Securities and Exchange Commission of Pakistan",
      desc: "Corporate registry and regulatory reference materials.",
      href: "https://www.secp.gov.pk/",
      tag: "Registry",
    },
    {
      title: "FBR — Federal Board of Revenue",
      desc: "Tax status reference and related public information (NTN/filing context).",
      href: "https://www.fbr.gov.pk/",
      tag: "Tax",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>
              DASHBOARD / IMPORTANT LINKS
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 950, color: "#0f172a" }}>
              Important Links
            </h1>
            <p style={{ marginTop: 8, color: "#64748b", lineHeight: 1.6, maxWidth: 820 }}>
              Curated reference links for AML/CFT standards and Pakistan-specific sources. These links are provided for
              convenience and do not constitute regulatory advice. All compliance decisions remain subject to human
              review and approval.
            </p>
          </div>

          <div
            style={{
              alignSelf: "flex-start",
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#0f172a",
              fontWeight: 900,
              fontSize: 12,
            }}
            title="This list is curated. In future versions, admins can manage links in the control panel."
          >
            Curated list • v1
          </div>
        </div>

        {msg ? <div style={{ marginTop: 12, color: "#0f172a" }}>{msg}</div> : null}

        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <Card title="Inspection-safe usage note">
            <div style={{ color: "#334155", lineHeight: 1.6 }}>
              Use these sources to support internal compliance workflows (CDD, screening references, policy drafting,
              and inspection preparation). This platform does not automatically file reports or communicate with
              regulators.
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {links.map((x) => (
              <a
                key={x.href}
                href={x.href}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: 16,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 950, color: "#0f172a", lineHeight: 1.3 }}>{x.title}</div>
                    <Tag>{x.tag}</Tag>
                  </div>
                  <div style={{ color: "#64748b", lineHeight: 1.55, fontSize: 13 }}>{x.desc}</div>
                  <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 900, color: "#0f172a" }}>Open</span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>↗</span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
            Last updated: {new Date().toLocaleDateString("en-PK")} (curated list). In future versions, admins can update
            these links in the control panel.
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <a href="/dashboard" style={{ textDecoration: "none", fontWeight: 900, color: "#0f172a" }}>
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
      <div style={{ fontWeight: 950, marginBottom: 10, color: "#0f172a" }}>{title}</div>
      {children}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #e2e8f0",
        background: "#f1f5f9",
        color: "#0f172a",
        fontWeight: 950,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
