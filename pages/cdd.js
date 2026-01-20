import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

export default function CddPage() {
  // Core state
  const [customerType, setCustomerType] = useState(""); // "natural" | "legal"
  const [formData, setFormData] = useState({});

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ✅ Stable change handler (fixes “1 character then click again” issues in most cases)
  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // Customer type change
  function handleCustomerTypeChange(e) {
    const newType = e.target.value;
    setCustomerType(newType);

    // Reset only when switching type (safe)
    setFormData({});
    setSaveError("");
  }

  // Required-field validation (logic-first; no fancy UI validation yet)
  function validateCdd({ customerType, formData }) {
    const missing = [];

    function req(key, label) {
      const v = formData?.[key];
      const ok =
        v !== undefined &&
        v !== null &&
        String(v).trim() !== "" &&
        v !== false; // checkbox
      if (!ok) missing.push(label);
    }

    if (!customerType) missing.push("Nature of Customer");

    if (customerType === "natural") {
      req("id_number", "CNIC/Passport No");
      req("nationality", "Nationality");
      req("country_of_residence", "Country of Residence");
      req("acting_capacity", "Acting Capacity");
      req("occupation", "Occupation");
      req("industry_sector", "Industry/Sector");
      req("source_of_funds", "Source of Funds");
      req("declared_income_band", "Declared Income (FBR)");
      req("purpose", "Purpose of Transaction");
      req("transaction_amount", "Exact Transaction Amount (PKR)");
      req("payment_mode", "Payment Mode");
      req("pakistan_geography", "Pakistan Geography");
      req("foreign_exposure", "Foreign Exposure");
      req("pep_status", "PEP Status");
      req("consent", "Declaration + Consent");
    }

    if (customerType === "legal") {
      req("entity_type", "Entity Type");
      req("country_incorporation", "Country of Incorporation");
      req("province_registration", "Province/Area Registration");
      req("pakistan_geography", "Pakistan Geography");
      req("business_sector", "Business Sector");
      req("ownership_structure", "Ownership Structure");
      req("bo_status", "Beneficial Ownership Status");
      req("ubo_country_risk", "UBO Country Risk");
      req("control_type", "Control Type");
      req("relationship_purpose", "Purpose of Relationship");
      req("transaction_amount", "Exact Transaction Amount (PKR)");
      req("source_of_funds", "Source of Funds");
      req("declared_turnover_band", "Declared Turnover (FBR)");
      req("hard_docs_submitted", "Hard documents submitted?");
      req("consent", "Declaration + Consent");
    }

    // Numeric check
    if (formData?.transaction_amount && isNaN(Number(formData.transaction_amount))) {
      missing.push("Transaction Amount must be numeric");
    }

    return missing;
  }

  // Step 9 output still saves as draft case (PDF later)
  async function handleGenerate() {
    setSaveError("");

    const missing = validateCdd({ customerType, formData });
    if (missing.length > 0) {
      alert("Please complete:\n\n- " + missing.join("\n- "));
      return;
    }

    setSaving(true);

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const userId = userRes?.user?.id;
      if (!userId) {
        alert("Session expired. Please log in again.");
        return;
      }

      const answers = {
        ...formData,
        nature_of_customer: customerType,
      };

      const { data, error } = await supabase
        .from("cdd_cases")
        .insert([
          {
            user_id: userId,
            customer_type: customerType,
            answers,
            status: "draft",
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      window.location.href = `/cdd/cases/${data.id}`;
    } catch (e) {
      console.error(e);
      setSaveError(e?.message || "Failed to save CDD case.");
      alert(e?.message || "Failed to save CDD case.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- UI helpers (simple, not final styling) ----------
  function Field({ label, required, hint, children }) {
    return (
      <div style={{ display: "grid", gap: 6, paddingBottom: 14, borderBottom: "1px solid #eef2f7" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>
            {label} {required ? <span style={{ color: "#e11d48" }}>*</span> : null}
          </div>
          {hint ? <div style={{ fontSize: 12, color: "#64748b" }}>{hint}</div> : null}
        </div>
        {children}
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    outline: "none",
    background: "white",
  };

  const selectStyle = inputStyle;

  // ---------- Natural Person Form (15 questions) ----------
  function NaturalPersonForm() {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <h3 style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
          Natural Person — 15 Questions
        </h3>

        <Field label="CNIC/Passport No" required hint="Used for internal screening and inspection records.">
          <input
            type="text"
            name="id_number"
            value={formData.id_number || ""}
            onChange={handleChange}
            style={inputStyle}
            placeholder="e.g., 35201-1234567-8"
            autoComplete="off"
            inputMode="text"
          />
        </Field>

        <Field label="Nationality" required>
          <select name="nationality" value={formData.nationality || ""} onChange={handleChange} style={selectStyle}>
            <option value="">Select nationality</option>
            <option value="pakistani">Pakistani</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Country of Residence" required>
          <select
            name="country_of_residence"
            value={formData.country_of_residence || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select country</option>
            <option value="pakistan">Pakistan</option>
            <option value="uae">UAE</option>
            <option value="saudi">Saudi Arabia</option>
            <option value="qatar">Qatar</option>
            <option value="uk">United Kingdom</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Acting Capacity" required>
          <select
            name="acting_capacity"
            value={formData.acting_capacity || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="self">Self</option>
            <option value="on_behalf">On behalf of another person</option>
          </select>
        </Field>

        <Field label="Occupation" required>
          <select name="occupation" value={formData.occupation || ""} onChange={handleChange} style={selectStyle}>
            <option value="">Select</option>
            <option value="salaried_professional">Salaried / Professional</option>
            <option value="business_owner">Business Owner / Self-Employed</option>
            <option value="unemployed_other">Unemployed / Other</option>
            <option value="politician_public_office">Politician / Public Office Holder</option>
          </select>
        </Field>

        <Field label="Industry / Sector" required>
          <select
            name="industry_sector"
            value={formData.industry_sector || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="manufacturing_services">Manufacturing / Services</option>
            <option value="import_export">Import / Export</option>
            <option value="real_estate_dpms_cash_intensive">Real Estate / DPMS / Cash-Intensive</option>
          </select>
        </Field>

        <Field label="Source of Funds" required>
          <select
            name="source_of_funds"
            value={formData.source_of_funds || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="salary_business_income">Salary / Business Income</option>
            <option value="sale_asset_inheritance_loan">Sale of Asset / Inheritance / Bank Loan</option>
            <option value="private_loan">Private Loan</option>
            <option value="gift_other">Gift / Other</option>
          </select>
        </Field>

        <Field label="Declared Income in FBR Return (latest tax year)" required>
          <select
            name="declared_income_band"
            value={formData.declared_income_band || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select band</option>
            <option value="above_10m">Above PKR 10 Million</option>
            <option value="5_10m">PKR 5 – 10 Million</option>
            <option value="3_5m">PKR 3 – 5 Million</option>
            <option value="1_3m">PKR 1 – 3 Million</option>
            <option value="below_1m">Below PKR 1 Million</option>
            <option value="non_filer">Non-Filer</option>
          </select>
        </Field>

        <Field label="Purpose of Transaction" required>
          <select name="purpose" value={formData.purpose || ""} onChange={handleChange} style={selectStyle}>
            <option value="">Select</option>
            <option value="property_purchase">Property purchase</option>
            <option value="business_investment">Business investment</option>
            <option value="personal_savings">Personal savings</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Exact Transaction Amount (PKR)" required>
          <input
            type="text"
            name="transaction_amount"
            value={formData.transaction_amount || ""}
            onChange={handleChange}
            style={inputStyle}
            placeholder="e.g., 500000"
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>

        <Field label="Payment Mode" required>
          <select
            name="payment_mode"
            value={formData.payment_mode || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="bank">Bank</option>
            <option value="cheque">Cheque</option>
            <option value="mixed">Mixed</option>
            <option value="cash">Cash</option>
          </select>
        </Field>

        <Field label="Pakistan Geography" required>
          <select
            name="pakistan_geography"
            value={formData.pakistan_geography || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="karachi">Karachi</option>
            <option value="lahore">Lahore</option>
            <option value="islamabad">Islamabad</option>
            <option value="peshawar">Peshawar</option>
            <option value="quetta">Quetta</option>
            <option value="other">Other (Pakistan)</option>
          </select>
        </Field>

        <Field label="Foreign Exposure" required>
          <select
            name="foreign_exposure"
            value={formData.foreign_exposure || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="none">None</option>
            <option value="low_risk">Low-risk</option>
            <option value="high_risk">High-risk</option>
          </select>
        </Field>

        <Field label="PEP Status" required>
          <select name="pep_status" value={formData.pep_status || ""} onChange={handleChange} style={selectStyle}>
            <option value="">Select</option>
            <option value="not_pep">Not PEP</option>
            <option value="pep">PEP</option>
            <option value="close_associate">Close associate</option>
          </select>
        </Field>

        <Field label="Declaration + Consent" required>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              name="consent"
              checked={Boolean(formData.consent)}
              onChange={handleChange}
              style={{ marginTop: 4 }}
            />
            <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
              I declare the information provided is true and complete to the best of my knowledge. This record supports
              internal compliance and inspection preparation.
            </span>
          </label>
        </Field>
      </div>
    );
  }

  // ---------- Legal Person Form (15 questions) ----------
  function LegalPersonForm() {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <h3 style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
          Legal Person — 15 Questions
        </h3>

        <Field label="Entity Type" required>
          <select name="entity_type" value={formData.entity_type || ""} onChange={handleChange} style={selectStyle}>
            <option value="">Select</option>
            <option value="private_public_ltd_gov">Private/Public Limited / Government</option>
            <option value="partnership_llp_sole">Partnership / LLP / Sole Proprietorship</option>
            <option value="trust_ngo_waqf">Trust / NGO / Waqf</option>
          </select>
        </Field>

        <Field label="Country of Incorporation" required>
          <select
            name="country_incorporation"
            value={formData.country_incorporation || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="pakistan">Pakistan</option>
            <option value="foreign_low_risk">Foreign (Low-risk)</option>
            <option value="foreign_high_risk">Foreign (High-risk)</option>
          </select>
        </Field>

        <Field label="Province/Area Registration" required>
          <select
            name="province_registration"
            value={formData.province_registration || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="punjab">Punjab</option>
            <option value="sindh">Sindh</option>
            <option value="kpk">Khyber Pakhtunkhwa</option>
            <option value="balochistan">Balochistan</option>
            <option value="gb">Gilgit-Baltistan</option>
            <option value="ajk">AJK</option>
            <option value="islamabad">Islamabad</option>
          </select>
        </Field>

        <Field label="Pakistan Geography" required>
          <select
            name="pakistan_geography"
            value={formData.pakistan_geography || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="karachi">Karachi</option>
            <option value="quetta">Quetta</option>
            <option value="peshawar">Peshawar</option>
            <option value="high_risk_district">High-risk district (border/specific)</option>
            <option value="other">Other (Pakistan)</option>
          </select>
        </Field>

        <Field label="Business Sector" required>
          <select
            name="business_sector"
            value={formData.business_sector || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="manufacturing_services">Manufacturing / Services</option>
            <option value="import_export">Import / Export</option>
            <option value="real_estate_dpms_cash_intensive_ngo">Real Estate / DPMS / Cash-Intensive / NGO</option>
          </select>
        </Field>

        <Field label="Ownership Structure" required>
          <select
            name="ownership_structure"
            value={formData.ownership_structure || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="simple">Simple</option>
            <option value="moderate">Moderate</option>
            <option value="complex">Complex / Layered / Nominee</option>
          </select>
        </Field>

        <Field label="Beneficial Ownership Status" required>
          <select name="bo_status" value={formData.bo_status || ""} onChange={handleChange} style={selectStyle}>
            <option value="">Select</option>
            <option value="direct">Direct BO identified</option>
            <option value="indirect">Indirect BO</option>
            <option value="no_clear_bo">No clear BO</option>
          </select>
        </Field>

        <Field label="UBO Country Risk" required>
          <select
            name="ubo_country_risk"
            value={formData.ubo_country_risk || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="pakistan">Pakistan</option>
            <option value="foreign_low">Foreign – Low Risk</option>
            <option value="foreign_high">Foreign – High Risk</option>
          </select>
        </Field>

        <Field label="Control Type" required>
          <select name="control_type" value={formData.control_type || ""} onChange={handleChange} style={selectStyle}>
            <option value="">Select</option>
            <option value="owners_board">Owners / Board</option>
            <option value="trustee_settlor">Trustee / Settlor</option>
            <option value="nominee_poa">Nominee / POA</option>
          </select>
        </Field>

        <Field label="Purpose of Relationship" required>
          <select
            name="relationship_purpose"
            value={formData.relationship_purpose || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="property">Property transaction</option>
            <option value="agency_services">Agency / intermediary services</option>
            <option value="corporate_services">Corporate services</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Exact Transaction Amount (PKR)" required>
          <input
            type="text"
            name="transaction_amount"
            value={formData.transaction_amount || ""}
            onChange={handleChange}
            style={inputStyle}
            placeholder="e.g., 5000000"
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>

        <Field label="Source of Funds" required>
          <select
            name="source_of_funds"
            value={formData.source_of_funds || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="salary_business_income">Salary / Business Income</option>
            <option value="sale_asset_inheritance_loan">Sale of Asset / Inheritance / Bank Loan</option>
            <option value="private_loan">Private Loan</option>
            <option value="gift_other">Gift / Other</option>
          </select>
        </Field>

        <Field label="Declared Turnover in FBR Return (latest tax year)" required>
          <select
            name="declared_turnover_band"
            value={formData.declared_turnover_band || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select band</option>
            <option value="above_100m">Above PKR 100 Million</option>
            <option value="50_100m">PKR 50 – 100 Million</option>
            <option value="10_50m">PKR 10 – 50 Million</option>
            <option value="5_10m">PKR 5 – 10 Million</option>
            <option value="below_5m">Below PKR 5 Million</option>
            <option value="non_filer">Non-Filer</option>
          </select>
        </Field>

        <Field label="Hard documents submitted?" required hint="Required to complete CDD for legal persons.">
          <select
            name="hard_docs_submitted"
            value={formData.hard_docs_submitted || ""}
            onChange={handleChange}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>

        <Field label="Declaration + Consent" required>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              name="consent"
              checked={Boolean(formData.consent)}
              onChange={handleChange}
              style={{ marginTop: 4 }}
            />
            <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
              I declare the information provided is true and complete to the best of my knowledge. This record supports
              internal compliance and inspection preparation.
            </span>
          </label>
        </Field>
      </div>
    );
  }

  return (
    <AppShell title="CDD / KYC / EDD">
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>CDD / KYC / EDD</div>
              <div style={{ marginTop: 6, color: "#64748b", maxWidth: 720, lineHeight: 1.5 }}>
                Inspection-safe workflow. This system does not submit anything to regulators. Final decisions remain
                subject to human review and approval.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a
                href="/dashboard"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  textDecoration: "none",
                  color: "#0f172a",
                  fontWeight: 800,
                }}
              >
                Dashboard
              </a>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#0f172a",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </div>
          </div>

          {/* Main card */}
          <div
            style={{
              marginTop: 16,
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>CDD / KYC Form</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                Complete the required fields. Reports are generated for documentation and review only.
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* Customer type */}
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Nature of Customer *</div>
                <select value={customerType} onChange={handleCustomerTypeChange} style={selectStyle}>
                  <option value="">Select</option>
                  <option value="natural">Natural Person</option>
                  <option value="legal">Legal Person</option>
                </select>
              </div>

              {/* Forms */}
              <div style={{ marginTop: 18 }}>
                {customerType === "natural" ? <NaturalPersonForm /> : null}
                {customerType === "legal" ? <LegalPersonForm /> : null}
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div
            style={{
              marginTop: 16,
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>Generate CDD/KYC Report</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Saves a draft case for inspection records. PDF generation will be added next.
              </div>
              {saveError ? <div style={{ marginTop: 8, color: "#be123c", fontWeight: 800 }}>{saveError}</div> : null}
            </div>

            <button
              onClick={handleGenerate}
              disabled={saving}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #0f172a",
                background: saving ? "#94a3b8" : "#0f172a",
                color: "white",
                fontWeight: 900,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Processing…" : "Generate CDD/KYC Report"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
