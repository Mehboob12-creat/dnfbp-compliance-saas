import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { getOrCreateClient } from "../../utils/client";

export default function NewCustomer() {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [msg, setMsg] = useState("");

  // 15-question fields (natural person)
  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dob, setDob] = useState("");
  const [cityDistrict, setCityDistrict] = useState("");

  const [profession, setProfession] = useState("business_person");
  const [filerStatus, setFilerStatus] = useState("non_filer");
  const [annualIncome, setAnnualIncome] = useState("");
  const [ntn, setNtn] = useState("");

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("property_purchase");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [sourceOfFunds, setSourceOfFunds] = useState("business_income");
  const [pepStatus, setPepStatus] = useState("no");
  const [previousStrCtr, setPreviousStrCtr] = useState("no");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      try {
        const c = await getOrCreateClient();
        setClient(c);
      } catch (e) {
        setMsg(e.message || "Failed to load client profile.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("Saving...");

    if (!client) {
      setMsg("Client profile missing. Please refresh.");
      return;
    }

    try {
      // 1) Create customer
      const { data: cust, error: custErr } = await supabase
        .from("customers")
        .insert([
          {
            client_id: client.id,
            customer_type: "natural",
            full_name: fullName,
            cnic,
            father_or_spouse_name: fatherName,
            date_of_birth: dob || null,
            city_district: cityDistrict,
            profession,
            filer_status: filerStatus,
            annual_income: annualIncome ? Number(annualIncome) : null,
            ntn
          }
        ])
        .select()
        .single();

      if (custErr) throw custErr;

      // 2) Create transaction
      const { data: txn, error: txnErr } = await supabase
        .from("transactions")
        .insert([
          {
            client_id: client.id,
            customer_id: cust.id,
            amount: Number(amount),
            purpose,
            payment_mode: paymentMode,
            source_of_funds: sourceOfFunds,
            pep_status: pepStatus,
            previous_str_ctr: previousStrCtr
          }
        ])
        .select()
        .single();

      if (txnErr) throw txnErr;

      setMsg("Saved! Now calculating risk...");

      // For now: go to a simple “customer view” page later
      window.location.href = `/customers/${cust.id}`;
    } catch (err) {
      setMsg(err.message || "Error saving. Check your inputs.");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#f8fafc" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Add Customer (Natural Person)</h1>
            <p style={{ color: "#64748b", marginTop: 6 }}>15-question DNFBP onboarding wizard</p>
          </div>
          <a href="/dashboard" style={{ textDecoration: "none" }}>← Back</a>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <Section title="Basic Identity (5)">
            <Field label="Full Name (CNIC)">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
            <Field label="CNIC Number">
              <input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35201-1234567-8" />
            </Field>
            <Field label="Father/Husband Name">
              <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>
            <Field label="City / District">
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

            <Field label="Declared Annual Income (PKR)">
              <input type="number" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} placeholder="500000" />
            </Field>

            <Field label="NTN (if available)">
              <input value={ntn} onChange={(e) => setNtn(e.target.value)} />
            </Field>
          </Section>

          <Section title="Transaction Details (6)">
            <Field label="Transaction Amount (PKR)">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="1500000" />
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
                cursor: "pointer"
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
