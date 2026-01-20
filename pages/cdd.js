import { useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

export default function CddPage() {
  const [customerType, setCustomerType] = useState("");
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleCustomerTypeChange(e) {
    setCustomerType(e.target.value);
    setFormData({});
  }

  async function handleGenerate() {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Session expired");

      const { data, error } = await supabase
        .from("cdd_cases")
        .insert([{
          user_id: userId,
          customer_type: customerType,
          answers: { ...formData, nature_of_customer: customerType },
          status: "draft",
        }])
        .select("id")
        .single();

      if (error) throw error;
      window.location.href = `/cdd/cases/${data.id}`;
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ label, name, type = "text", options }) => (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-slate-800">
        {label} <span className="text-red-600">*</span>
      </label>
      {options ? (
        <select
          name={name}
          value={formData[name] || ""}
          onChange={handleChange}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Select</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={formData[name] || ""}
          onChange={handleChange}
          className="w-full rounded-lg border px-3 py-2"
        />
      )}
    </div>
  );

  const NaturalPersonForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Field label="CNIC / Passport No" name="id_number" />
      <Field label="Nationality + Residence" name="nationality_residence" />
      <Field label="Acting Capacity" name="acting_capacity" options={[
        { value: "self", label: "Self" },
        { value: "on_behalf", label: "On behalf" },
      ]}/>
      <Field label="Occupation" name="occupation" options={[
        { value: "salaried", label: "Salaried" },
        { value: "business", label: "Business" },
        { value: "other", label: "Other" },
      ]}/>
      <Field label="Industry / Sector" name="industry_sector" />
      <Field label="Source of Funds" name="source_of_funds" />
      <Field label="Declared Income (FBR)" name="declared_income_band" />
      <Field label="Purpose of Transaction" name="purpose" />
      <Field label="Transaction Amount (PKR)" name="transaction_amount" />
      <Field label="Payment Mode" name="payment_mode" options={[
        { value: "bank", label: "Bank" },
        { value: "cheque", label: "Cheque" },
        { value: "cash", label: "Cash" },
      ]}/>
      <Field label="Pakistan Geography" name="pakistan_geography" />
      <Field label="Foreign Exposure" name="foreign_exposure" />
      <Field label="PEP Status" name="pep_status" />
      <div className="md:col-span-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="consent"
            checked={formData.consent || false}
            onChange={handleChange}
          />
          <span className="text-sm">Declaration & Consent</span>
        </label>
      </div>
    </div>
  );

  const LegalPersonForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Field label="Entity Type" name="entity_type" />
      <Field label="Country of Incorporation" name="country_incorporation" />
      <Field label="Province / Area" name="province_registration" />
      <Field label="Pakistan Geography" name="pakistan_geography" />
      <Field label="Business Sector" name="business_sector" />
      <Field label="Ownership Structure" name="ownership_structure" />
      <Field label="Beneficial Ownership Status" name="bo_status" />
      <Field label="UBO Country Risk" name="ubo_country_risk" />
      <Field label="Control Type" name="control_type" />
      <Field label="Purpose of Relationship" name="relationship_purpose" />
      <Field label="Transaction Amount (PKR)" name="transaction_amount" />
      <Field label="Source of Funds" name="source_of_funds" />
      <Field label="Declared Turnover (FBR)" name="declared_turnover_band" />
      <div className="md:col-span-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="hard_docs_submitted"
            checked={formData.hard_docs_submitted || false}
            onChange={handleChange}
          />
          <span className="text-sm">Hard documents submitted</span>
        </label>
      </div>
      <div className="md:col-span-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="consent"
            checked={formData.consent || false}
            onChange={handleChange}
          />
          <span className="text-sm">Declaration & Consent</span>
        </label>
      </div>
    </div>
  );

  return (
    <AppShell title="CDD / KYC / EDD">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">CDD / KYC / EDD</h1>
        <p className="text-sm text-slate-600">
          Inspection-safe workflow. No automatic filings. Final decisions require human review.
        </p>

        <Field
          label="Nature of Customer"
          name="nature_of_customer"
          options={[
            { value: "natural", label: "Natural Person" },
            { value: "legal", label: "Legal Person" },
          ]}
        />

        {customerType === "natural" && <NaturalPersonForm />}
        {customerType === "legal" && <LegalPersonForm />}

        <div className="pt-6">
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold"
          >
            {saving ? "Processing…" : "Generate CDD/KYC Report"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
