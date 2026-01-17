import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function CustomerFile() {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [txs, setTxs] = useState([]);
  const [msg, setMsg] = useState("Loading...");
  const [saving, setSaving] = useState(false);

  // Transaction form
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("property");
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [sourceOfFunds, setSourceOfFunds] = useState("salary");
  const [pepStatus, setPepStatus] = useState("no");

  useEffect(() => {
    async function boot() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }
      setUser(userData.user);

      const id = getCustomerIdFromPath();
      if (!id) {
        setMsg("Missing customer id.");
        return;
      }

      await loadCustomer(id);
      await loadTxs(id);
      setMsg("");
    }

    boot();
  }, []);

  function getCustomerIdFromPath() {
    // Works without router import
    const parts = window.location.pathname.split("/");
    return parts[2] || null; // /customers/<id>
  }

  async function loadCustomer(id) {
    const { data, error } = await supabase
      .from("customers")
      .select("id, client_id, full_name, cnic, father_name, date_of_birth, city_district, profession, filer_status, annual_income, ntn, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      return;
    }
    setCustomer(data);
  }

  async function loadTxs(id) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, amount, purpose, payment_mode, source_of_funds, pep_status, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      // if table missing/rls etc, show error
      setMsg(error.message);
      return;
    }
    setTxs(data || []);
  }

  async function addTransaction() {
    if (!customer) return;
    if (!amount || Number(amount) <= 0) {
      alert("Enter a valid transaction amount.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        client_id: customer.client_id,
        customer_id: customer.id,
        amount: Number(amount),
        purpose,
        payment_mode: paymentMode,
        source_of_funds: sourceOfFunds,
        pep_status: pepStatus,
      };

      const { error } = await supabase.from("transactions").insert([payload]);
      if (error) throw error;

      setAmount("");
      await loadTxs(customer.id);
      alert("Transaction saved ✅");
    } catch (e) {
      alert(e?.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <a href="/customers" style={{ textDecoration: "none" }}>← Customers</a>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginTop: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950 }}>
              {customer?.full_name || "Customer File"}
            </h1>
            <p style={{ marginTop: 6, color: "#64748b" }}>
              CNIC: {customer?.cnic || "-"} • City: {customer?.city_district || "-"}
            </p>
          </div>

          <a href="/dashboard" style={ghostBtn}>Dashboard</a>
        </div>

        {msg ? <div style={{ marginTop: 12 }}>{msg}</div> : null}

        {/* Customer details */}
        {customer && (
          <div style={card}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Customer Details</div>
            <div style={grid2}>
              <Info label="Father/Husband Name" value={customer.father_name} />
              <Info label="DOB" value={customer.date_of_birth} />
              <Info label="Profession" value={customer.profession} />
              <Info label="Filer Status" value={customer.filer_status} />
              <Info label="Annual Income" value={customer.annual_income} />
              <Info label="NTN" value={customer.ntn} />
            </div>
          </div>
        )}

        {/* Add transaction */}
        {customer && (
          <div style={card}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Add Transaction</div>

            <div style={grid2}>
              <Field label="Amount (PKR)">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1500000"
                  style={input}
                />
              </Field>

              <Field label="Purpose">
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={input}>
                  <option value="property">Property</option>
                  <option value="jewelry">Jewelry</option>
                  <option value="legal">Legal Services</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Mode of Payment">
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} style={input}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="digital_wallet">Digital Wallet</option>
                  <option value="foreign_remittance">Foreign Remittance</option>
                  <option value="cash">Cash</option>
                </select>
              </Field>

              <Field label="Source of Funds">
                <select value={sourceOfFunds} onChange={(e) => setSourceOfFunds(e.target.value)} style={input}>
                  <option value="salary">Salary</option>
                  <option value="business_income">Business Income</option>
                  <option value="sale_of_asset">Sale of Asset</option>
                  <option value="foreign_remittance">Foreign Remittance</option>
                  <option value="inheritance_gift">Inheritance/Gift</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="PEP Status">
                <select value={pepStatus} onChange={(e) => setPepStatus(e.target.value)} style={input}>
                  <option value="no">Not a PEP</option>
                  <option value="family">Family Member of PEP</option>
                  <option value="yes">Politically Exposed Person</option>
                </select>
              </Field>
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={addTransaction} disabled={saving} style={primaryBtn}>
                {saving ? "Saving..." : "Save Transaction"}
              </button>
            </div>
          </div>
        )}

        {/* Transactions list */}
        <div style={card}>
          <div style={{ fontWeight: 950, marginBottom: 10 }}>Transactions</div>

          {txs.length === 0 ? (
            <div style={{ color: "#64748b" }}>No transactions yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {txs.map((t) => (
                <div key={t.id} style={txRow}>
                  <div style={{ fontWeight: 900 }}>PKR {Number(t.amount).toLocaleString()}</div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                    {t.purpose} • {t.payment_mode} • {t.source_of_funds} • PEP: {t.pep_status}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, color: "#64748b", fontSize: 12 }}>
          Logged in as: {user.email}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>{label}</div>
      <div style={{ fontWeight: 900, color: "#0f172a" }}>{value || "-"}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const card = {
  marginTop: 14,
  padding: 16,
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const input = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  outline: "none",
  background: "white",
};

const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid #0f172a",
  background: "#0f172a",
  color: "white",
  fontWeight: 950,
  cursor: "pointer",
};

const ghostBtn = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
  textDecoration: "none",
  color: "#0f172a",
};

const txRow = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background: "#fff",
};
