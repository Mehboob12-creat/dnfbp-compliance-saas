import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function CustomerView() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    async function load() {
      const id = window.location.pathname.split("/").pop();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (custErr) {
        setMsg(custErr.message);
        return;
      }

      const { data: txns } = await supabase
        .from("transactions")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      setData({ customer, latestTransaction: txns?.[0] || null });
      setMsg("");
    }
    load();
  }, []);

  if (!data) return <div style={{ padding: 24 }}>{msg}</div>;

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <a href="/dashboard" style={{ textDecoration: "none" }}>← Back</a>

        <h1 style={{ fontSize: 26, fontWeight: 900, marginTop: 12 }}>
          {data.customer.full_name}
        </h1>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <Card title="Customer Profile">
            <Row k="CNIC" v={data.customer.cnic || "-"} />
            <Row k="City/District" v={data.customer.city_district || "-"} />
            <Row k="Profession" v={data.customer.profession || "-"} />
            <Row k="Filer Status" v={data.customer.filer_status || "-"} />
            <Row k="Annual Income" v={data.customer.annual_income || "-"} />
          </Card>

          <Card title="Latest Transaction">
            <Row k="Amount" v={data.latestTransaction?.amount || "-"} />
            <Row k="Purpose" v={data.latestTransaction?.purpose || "-"} />
            <Row k="Payment Mode" v={data.latestTransaction?.payment_mode || "-"} />
            <Row k="Source of Funds" v={data.latestTransaction?.source_of_funds || "-"} />
            <Row k="PEP" v={data.latestTransaction?.pep_status || "-"} />
          </Card>

          <Card title="Next Step">
            <div>✅ Next we will add Risk Score + Red Flags + STR/CTR recommendation here.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div style={{ color: "#64748b" }}>{k}</div>
      <div style={{ fontWeight: 700 }}>{String(v)}</div>
    </div>
  );
}
