import { useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

/* ------------------ Shared UI helpers ------------------ */
function Field({ label, required, hint, children }) {
  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
      <div style={{ fontWeight: 800, color: "#0f172a" }}>
        {label} {required && <span style={{ color: "#e11d48" }}>*</span>}
      </div>
      {children}
      {hint && <div style={{ fontSize: 12, color: "#64748b" }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

const selectStyle = inputStyle;

/* ------------------ NATURAL PERSON FORM ------------------ */
function NaturalPersonForm({ formData, handleChange }) {
  return (
    <>
      <h3 style={{ fontWeight: 900, margin: "16px 0" }}>
        Natural Person – 15 Questions
      </h3>

      <Field label="CNIC / Passport No" required>
        <input
          name="id_number"
          value={formData.id_number || ""}
          onChange={handleChange}
          style={inputStyle}
        />
      </Field>

      <Field label="Nationality" required>
        <select
          name="nationality"
          value={formData.nationality || ""}
          onChange={handleChange}
          style={selectStyle}
        >
          <option value="">Select</option>
          <option value="pakistani">Pakistani</option>
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
          <option value="on_behalf">On behalf</option>
        </select>
      </Field>

      <Field label="Occupation" required>
        <select
          name="occupation"
          value={formData.occupation || ""}
          onChange={handleChange}
          style={selectStyle}
        >
          <option value="">Select</option>
          <option value="professional">Professional</option>
          <option value="business">Business</option>
          <option value="unemployed">Unemployed</option>
        </select>
      </Field>

      <Field label="Transaction Amount (PKR)" required>
        <input
          name="transaction_amount"
          value={formData.transaction_amount || ""}
          onChange={handleChange}
          style={inputStyle}
        />
      </Field>

      <Field label="Declaration + Consent" required>
        <label style={{ display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            name="consent"
            checked={!!formData.consent}
            onChange={handleChange}
          />
          <span>I confirm the information is correct.</span>
        </label>
      </Field>
    </>
  );
}

/* ------------------ LEGAL PERSON FORM ------------------ */
function LegalPersonForm({ formData, handleChange }) {
  return (
    <>
      <h3 style={{ fontWeight: 900, margin: "16px 0" }}>
        Legal Person – 15 Questions
      </h3>

      <Field label="Entity Type" required>
        <select
          name="entity_type"
          value={formData.entity_type || ""}
          onChange={handleChange}
          style={selectStyle}
        >
          <option value="">Select</option>
          <option value="company">Company</option>
          <option value="partnership">Partnership</option>
          <option value="ngo">NGO / Trust</option>
        </select>
      </Field>

      <Field label="Country of Incorporation" required>
        <input
          name="country_incorporation"
          value={formData.country_incorporation || ""}
          onChange={handleChange}
          style={inputStyle}
        />
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
          <option value="complex">Complex</option>
        </select>
      </Field>

      <Field label="Transaction Amount (PKR)" required>
        <input
          name="transaction_amount"
          value={formData.transaction_amount || ""}
          onChange={handleChange}
          style={inputStyle}
        />
      </Field>

      <Field label="Hard documents submitted?" required>
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
        <label style={{ display: "flex", gap: 8 }}>
          <input
            type="checkbox"
            name="consent"
            checked={!!formData.consent}
            onChange={handleChange}
          />
          <span>I confirm the information is correct.</span>
        </label>
      </Field>
    </>
  );
}

/* ------------------ MAIN PAGE ------------------ */
export default function CddPage() {
  const [customerType, setCustomerType] = useState("");
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleGenerate() {
    setSaving(true);
    alert("Draft saved. Next steps coming.");
    setSaving(false);
  }

  return (
    <AppShell title="CDD / KYC / EDD">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>CDD / KYC / EDD</h1>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          Inspection-safe workflow. This system does not submit anything to regulators.
        </p>

        <Field label="Nature of Customer" required>
          <select
            value={customerType}
            onChange={(e) => {
              setCustomerType(e.target.value);
              setFormData({});
            }}
            style={selectStyle}
          >
            <option value="">Select</option>
            <option value="natural">Natural Person</option>
            <option value="legal">Legal Person</option>
          </select>
        </Field>

        {customerType === "natural" && (
          <NaturalPersonForm formData={formData} handleChange={handleChange} />
        )}

        {customerType === "legal" && (
          <LegalPersonForm formData={formData} handleChange={handleChange} />
        )}

        <button
          onClick={handleGenerate}
          disabled={saving}
          style={{
            marginTop: 24,
            padding: "14px 20px",
            background: "#0f172a",
            color: "white",
            borderRadius: 12,
            fontWeight: 900,
          }}
        >
          Generate CDD / KYC Report
        </button>
      </div>
    </AppShell>
  );
}
