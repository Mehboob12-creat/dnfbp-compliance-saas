import { useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

/* -----------------------
   Shared styles
------------------------ */
const input =
  "mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300";

/* =======================
   NATURAL PERSON FORM
======================= */
function NaturalPersonForm({ formData, handleChange }) {
  return (
    <div className="space-y-10 mt-8">

      <section className="rounded-2xl border border-slate-200 p-8 bg-white">
        <h3 className="text-xl font-bold mb-2">Natural Person Details</h3>
        <p className="text-sm text-slate-600 mb-6">
          Identity and personal information.
        </p>

        <div className="space-y-6">
          <Question label="CNIC / Passport No *">
            <input name="id_number" value={formData.id_number || ""} onChange={handleChange} className={input} />
          </Question>

          <Question label="Nationality + Country of Residence *">
            <input name="nationality_residence" value={formData.nationality_residence || ""} onChange={handleChange} className={input} />
          </Question>

          <Question label="Acting Capacity *">
            <select name="acting_capacity" value={formData.acting_capacity || ""} onChange={handleChange} className={input}>
              <option value="">Select</option>
              <option value="self">Self</option>
              <option value="on_behalf">On behalf</option>
            </select>
          </Question>

          <Question label="Occupation *">
            <select name="occupation" value={formData.occupation || ""} onChange={handleChange} className={input}>
              <option value="">Select</option>
              <option value="employed">Employed</option>
              <option value="business">Business Owner</option>
              <option value="other">Other</option>
            </select>
          </Question>
        </div>
      </section>

      <Declaration formData={formData} handleChange={handleChange} />
    </div>
  );
}

/* =======================
   LEGAL PERSON FORM
======================= */
function LegalPersonForm({ formData, handleChange }) {
  return (
    <div className="space-y-10 mt-8">

      <section className="rounded-2xl border border-slate-200 p-8 bg-white">
        <h3 className="text-xl font-bold mb-2">Legal Entity Details</h3>
        <p className="text-sm text-slate-600 mb-6">
          Entity registration and ownership information.
        </p>

        <div className="space-y-6">
          <Question label="Entity Type *">
            <select name="entity_type" value={formData.entity_type || ""} onChange={handleChange} className={input}>
              <option value="">Select</option>
              <option value="private_ltd">Private Limited</option>
              <option value="partnership">Partnership</option>
              <option value="trust">Trust / NGO</option>
            </select>
          </Question>

          <Question label="Country of Incorporation *">
            <input name="country_incorporation" value={formData.country_incorporation || ""} onChange={handleChange} className={input} />
          </Question>

          <Question label="Business Sector *">
            <select name="business_sector" value={formData.business_sector || ""} onChange={handleChange} className={input}>
              <option value="">Select</option>
              <option value="real_estate">Real Estate</option>
              <option value="dpms">DPMS</option>
              <option value="services">Services</option>
            </select>
          </Question>

          <Question label="Beneficial Ownership Status *">
            <select name="bo_status" value={formData.bo_status || ""} onChange={handleChange} className={input}>
              <option value="">Select</option>
              <option value="direct">Direct BO Identified</option>
              <option value="indirect">Indirect BO</option>
              <option value="none">No Clear BO</option>
            </select>
          </Question>
        </div>
      </section>

      <Declaration formData={formData} handleChange={handleChange} />
    </div>
  );
}

/* =======================
   QUESTION BLOCK
======================= */
function Question({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}

/* =======================
   DECLARATION
======================= */
function Declaration({ formData, handleChange }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
      <label className="flex gap-3">
        <input type="checkbox" name="consent" checked={formData.consent || false} onChange={handleChange} />
        <span className="text-sm text-slate-700">
          I declare that the information provided is true and complete.
        </span>
      </label>
    </section>
  );
}

/* =======================
   MAIN PAGE
======================= */
export default function CddPage() {
  const [customerType, setCustomerType] = useState("");
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleGenerate() {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) throw new Error("Session expired");

      await supabase.from("cdd_cases").insert([
        { user_id: userRes.user.id, customer_type: customerType, answers: formData, status: "draft" }
      ]);

      alert("CDD case saved.");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="CDD / KYC / EDD">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        <header className="space-y-2">
          <h1 className="text-3xl font-bold">CDD / KYC / EDD</h1>
          <p className="text-sm text-slate-600">
            Inspection-safe overview of records, evidence coverage, and workflow items.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 p-8 bg-white">
          <Question label="Nature of Customer *">
            <select
              value={customerType}
              onChange={(e) => {
                setCustomerType(e.target.value);
                setFormData({});
              }}
              className={input}
            >
              <option value="">Select</option>
              <option value="natural">Natural Person</option>
              <option value="legal">Legal Person</option>
            </select>
          </Question>
        </section>

        {customerType === "natural" && (
          <NaturalPersonForm formData={formData} handleChange={handleChange} />
        )}

        {customerType === "legal" && (
          <LegalPersonForm formData={formData} handleChange={handleChange} />
        )}

        <div className="sticky bottom-6">
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="w-full rounded-xl bg-slate-900 py-4 text-white font-bold"
          >
            {saving ? "Processing…" : "Generate CDD/KYC Report"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
