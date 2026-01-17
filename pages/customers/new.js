import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { getOrCreateClient } from "../../utils/client";

export default function NewCustomer() {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [msg, setMsg] = useState("");

  // Identity
  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dob, setDob] = useState("");
  const [cityDistrict, setCityDistrict] = useState("");

  // Financial
  const [profession, setProfession] = useState("business_person");
  const [filerStatus, setFilerStatus] = useState("non_filer");
  const [annualIncome, setAnnualIncome] = useState("");
  const [ntn, setNtn] = useState("");

  // Transaction
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("property_purchase");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [sourceOfFunds, setSourceOfFunds] = useState("business_income");
  const [pepStatus, setPepStatus] = useState("no");
  const [previousStrCtr, setPreviousStrCtr] = useState("no");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/login";
        return;
      }

      try {
        const c = await getOrCreateClient();
        setClient(c);
      } catch (e) {
        setMsg(e.message || "Failed to load your business profile (client).");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function validateCNIC(value) {
    if (!value) return true;
    // Simple CNIC format: 12345-1234567-1
    return /^\d{5}-\d{7}-\d{1}$/.test(value.trim());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!client?.id) {
      setMsg("Client profile missing. Please refresh.");
      return;
    }

    if (!fullName.trim()) {
      setMsg("Full Name is required.");
      return;
    }

    if (!validateCNIC(cnic)) {
      setMsg("CNIC format must be like: 35201-1234567-8");
      return;
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setMsg("Please enter a valid Transaction Amount.");
      return;
    }

    setMsg("Saving...");

    try {
      // 1) Insert customer
      const { data: cust, error: custErr } = await supabase
        .from("customers")
        .insert([
          {
            client_id: client.id,
            customer_type: "natural",
            full_name: fullName.trim(),
            cnic: cnic.trim() || null,
            father_or_spouse_name: fatherName.trim() || null,
            date_of_birth: dob || null,
            city_district: cityDistrict.trim() || null,
            profession,
            filer_status: filerStatus,
            annual_income: annualIncome ? Number(annualIncome) : null,
            ntn: ntn.trim() || null,
          },
        ])
        .select()
        .single();

      if (custErr) throw custErr;

      // 2) Insert transaction
      const { data: txn, error: txnErr } = await supabase
        .from("transactions")
        .insert([
          {
            client_id: client.id,
            customer_id: cust.id,
            amount: amt,
            purpose,
            payment_mode: paymentMode,
            source_of_funds: sourceOfFunds,
            pep_status: pepStatus,
            previous_str_ctr: previousStrCtr,
          },
        ])
        .select()
        .single();

      if (txnErr) throw txnErr;

      setMsg("Saved ✅ Opening customer file...");
      window.location.href = `/customers/${cust.id}`;
    } catch (err) {
      setMsg(err.message || "Error saving. Please try again.");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <TopBar title="Add Customer (Natural Person)" subtitle="15-question DNFBP onboarding wizard" />

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <Section title="Basic Identity (5)">
            <Field label="Full Name (as per CNIC) *">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>

            <Field label="CNIC Number (optional)">
              <input
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="35201-1234567-8"
              />
              <Hint ok={validateCNIC(cnic)}>
                Format: 12345-1234567-1
              </Hint>
            </Field>

            <Field label="Father/Husband Name (optional)">
              <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
            </Field>

            <Field label="Date of Birth (optional)">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>

            <Field label="Current City/District (optional)">
              <input value={cityDistrict} onChange={(e) => setCityDistrict(e.target.value)} />
            </Field>
          </Section>

          <Section title="Financial Profile (4)">
            <Field label="Profession/Business Type">
              <select value={profession} onChange={(e) => setProfession(e.target.value)}>
                <option value="real_estate_agent">Real Estate Agent</option>
                <option value="jewelry_dealer">Jewelry Dealer</option>
                <option value="lawyer_notary">Lawyer/Notary</option>
                <option value="accountant_auditor">Accountant/Auditor</option>
                <option value="business_person">Business Person</option>
                <option value="government_employee">Government Employee</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Filer Status">
              <select value={filerStatus} onChange={(e) => setFilerStatus(e.target.value)}>
                <option value="filer">Filer</option>
                <option value="non_filer">Non-Filer</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>

            <Field label="Declared Annual Income (PKR) (optional)">
              <input
                type="number"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
                placeholder="500000"
                min="0"
              />
            </Field>

            <Field label="NTN (optional)">
              <input value={ntn} onChange={(e) => setNtn(e.target.value)} />
            </Field>
          </Section>

          <Section title="Transaction Details (6)">
            <Field label="Transaction Amount (PKR) *">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="1500000"
                min="1"
              />
            </Field>

            <Field label="Purpose of Transaction">
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="property_purchase">Property Purchase</option>
                <option value="jewelry_purchase">Jewelry Purchase</option>
                <option value="legal_services">Legal Services</option>
                <option value="investment">Investment</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Mode of Payment">
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="foreign_remittance">Foreign Remittance</option>
                <option value="digital_wallet">Digital Wallet</option>
              </select>
            </Field>

            <Field label="Source of Funds">
              <select value={sourceOfFunds} onChange={(e) => setSourceOfFunds(e.target.value)}>
                <option value="salary">Salary</option>
                <option value="business_income">Business Income</option>
                <option value="sale_of_asset">Sale of Asset</option>
                <option value="foreign_remittance">Foreign Remittance</option>
                <option value="inheritance_gift">Inheritance/Gift</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>

            <Field label="PEP Declaration">
              <select value={pepStatus} onChange={(e) => setPepStatus(e.target.value)}>
                <option value="no">Not a PEP</option>
                <option value="yes">Politically Exposed Person</option>
                <option value="family">Family Member of PEP</option>
              </select>
            </Field>

            <Field label="Previous STR/CTR Filed">
              <select value={previousStrCtr} onChange={(e) => setPreviousStrCtr(e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="dont_know">Don't Know</option>
              </select>
            </Field>
          </Section>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="submit"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: "#0A1F44",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Save Customer
            </button>
            <span style={{ color: "#0f172a" }}>{msg}</span>
          </div>
        </form>
      </div>

      <style jsx>{`
        input, select {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
          outline: none;
        }
        input:focus, select:focus {
          border-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

function TopBar({ title, subtitle }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>{title}</h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>{subtitle}</p>
      </div>
      <a href="/dashboard" style={{ textDecoration: "none" }}>← Back</a>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

function Hint({ ok, children }) {
  return (
    <span style={{ fontSize: 12, color: ok ? "#64748b" : "#ef4444" }}>
      {children}
    </span>
  );
}
