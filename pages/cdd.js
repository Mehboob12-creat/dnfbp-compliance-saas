import { useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

/* -------------------------
   SHARED INPUT STYLES
-------------------------- */
const inputClass =
  "mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

/* =========================
   NATURAL PERSON FORM
========================= */
function NaturalPersonForm({ formData, handleChange }) {
  return (
    <div className="space-y-10">

      {/* SECTION: CUSTOMER DETAILS */}
      <section className="rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-black text-slate-900 mb-1">
          Customer Details
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Identity and personal profile information.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="font-bold text-sm">
              CNIC / Passport No *
            </label>
            <input
              name="id_number"
              value={formData.id_number || ""}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="font-bold text-sm">
              Nationality + Residence *
            </label>
            <input
              name="nationality_residence"
              value={formData.nationality_residence || ""}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="font-bold text-sm">Acting Capacity *</label>
            <select
              name="acting_capacity"
              value={formData.acting_capacity || ""}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select</option>
              <option value="self">Self</option>
              <option value="on_behalf">On behalf</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-sm">Occupation *</label>
            <select
              name="occupation"
              value={formData.occupation || ""}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select</option>
              <option value="employed">Employed</option>
              <option value="business">Business Owner</option>
              <option value="unemployed">Unemployed</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECTION: TRANSACTION */}
      <section className="rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-black text-slate-900 mb-1">
          Transaction Information
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Used for internal risk assessment.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="font-bold text-sm">Transaction Amount *</label>
            <input
              name="transaction_amount"
              value={formData.transaction_amount || ""}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="font-bold text-sm">Payment Mode *</label>
            <select
              name="payment_mode"
              value={formData.payment_mode || ""}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select</option>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>
      </section>

      {/* DECLARATION */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="consent"
            checked={formData.consent || false}
            onChange={handleChange}
            className="mt-1"
          />
          <span className="text-sm text-slate-700">
            I declare that the information provided is true and correct.
          </span>
        </label>
      </section>
    </div>
  );
}

/* =========================
   MAIN PAGE
========================= */
export default function CddPage() {
  const [customerType, setCustomerType] = useState("");
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleGenerate() {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Session expired");

      await supabase.from("cdd_cases").insert([
        {
          user_id: userId,
          customer_type: customerType,
          answers: formData,
          status: "draft",
        },
      ]);

      alert("CDD Case saved (draft).");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="CDD / KYC / EDD">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black">CDD / KYC / EDD</h1>
            <p className="text-sm text-slate-600">
              Inspection-safe workflow. No automatic filings.
            </p>
          </div>
          <a href="/dashboard" className="font-bold text-sm">
            Dashboard
          </a>
        </header>

        <section className="rounded-2xl border border-slate-200 p-6">
          <label className="font-bold text-sm">
            Nature of Customer *
          </label>
          <select
            value={customerType}
            onChange={(e) => {
              setCustomerType(e.target.value);
              setFormData({});
            }}
            className={inputClass}
          >
            <option value="">Select</option>
            <option value="natural">Natural Person</option>
            <option value="legal">Legal Person</option>
          </select>
        </section>

        {customerType === "natural" && (
          <NaturalPersonForm
            formData={formData}
            handleChange={handleChange}
          />
        )}

        <div className="sticky bottom-4">
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="w-full rounded-xl bg-slate-900 py-4 text-white font-black"
          >
            {saving ? "Processing…" : "Generate CDD/KYC Report"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
