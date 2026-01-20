import { useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

export default function CddPage() {
  // Core state
  const [customerType, setCustomerType] = useState(""); // "natural" | "legal"
  const [formData, setFormData] = useState({});

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleCustomerTypeChange(e) {
    const newType = e.target.value;

    // IMPORTANT: set both state + answers field
    setCustomerType(newType);
    setFormData((prev) => ({
      ...prev,
      nature_of_customer: newType,
    }));

    // If switching types, clear type-specific fields to avoid mixing
    // (But keep nature_of_customer)
    setFormData({ nature_of_customer: newType });
  }

  // Required-field validation (inspection-safe)
  function validateCdd({ customerType, formData }) {
    const missing = [];

    function req(key, label) {
      const v = formData?.[key];
      const ok =
        v !== undefined &&
        v !== null &&
        String(v).trim() !== "" &&
        v !== false;
      if (!ok) missing.push(label);
    }

    // Must have customerType selected
    if (!customerType) missing.push("Nature of Customer");

    if (customerType === "natural") {
      req("id_number", "CNIC/Passport No");
      req("nationality_residence", "Nationality + Country of Residence");
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

    // numeric check
    if (formData?.transaction_amount && isNaN(Number(formData.transaction_amount))) {
      missing.push("Transaction Amount must be numeric");
    }

    return missing;
  }

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

      // Insert answers safely
      const answers = {
        ...formData,
        nature_of_customer: customerType,
      };

      // IMPORTANT: customer_type must match DB check constraint
      // Your DB expects: "natural" or "legal" (based on earlier patterns)
      // If your DB expects different values, change here only.
      const { data, error } = await supabase
        .from("cdd_cases")
        .insert([
          {
            user_id: userId,
            customer_type: customerType, // "natural" | "legal"
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

  // ---------- DROPDOWN OPTIONS (Aligned to your Risk Spec) ----------
  const NATURAL = {
    acting_capacity: [
      { v: "self", l: "Self (acting on own behalf)" },
      { v: "on_behalf", l: "On behalf of another person" },
    ],
    occupation: [
      { v: "salaried_professional", l: "Salaried / Professional" },
      { v: "business_owner", l: "Business Owner / Self-Employed" },
      { v: "unemployed_other", l: "Unemployed / Other" },
      { v: "politician_public_office", l: "Politician / Public Office Holder (Very High override)" },
    ],
    industry_sector: [
      { v: "manufacturing_services", l: "Manufacturing / Services" },
      { v: "import_export", l: "Import / Export" },
      { v: "real_estate_dpms_cash_intensive", l: "Real Estate / DPMS / Cash-Intensive" },
    ],
    source_of_funds: [
      { v: "salary_business_income", l: "Salary / Business Income" },
      { v: "sale_asset_inheritance_bank_loan", l: "Sale of Asset / Inheritance / Bank Loan" },
      { v: "private_loan", l: "Private Loan" },
      { v: "gift_other", l: "Gift / Other" },
    ],
    declared_income_band: [
      { v: "above_10m", l: "Above PKR 10 Million" },
      { v: "5m_10m", l: "PKR 5 – 10 Million" },
      { v: "3m_5m", l: "PKR 3 – 5 Million" },
      { v: "1m_3m", l: "PKR 1 – 3 Million" },
      { v: "below_1m", l: "Below PKR 1 Million" },
      { v: "non_filer", l: "Non-Filer" },
    ],
    purpose: [
      { v: "property_purchase_sale", l: "Property purchase / sale" },
      { v: "investment", l: "Investment" },
      { v: "business", l: "Business purpose" },
      { v: "personal", l: "Personal / family" },
      { v: "other", l: "Other" },
    ],
    payment_mode: [
      { v: "bank", l: "Bank Transfer" },
      { v: "cheque", l: "Cheque" },
      { v: "mixed", l: "Mixed" },
      { v: "cash", l: "Cash" },
    ],
    pakistan_geography: [
      { v: "high_risk_districts", l: "High-Risk Districts (KP/Balochistan Border + South Punjab)" },
      { v: "karachi_quetta_peshawar", l: "Karachi / Quetta / Peshawar" },
      { v: "other_pakistan", l: "Other Pakistan locations" },
    ],
    foreign_exposure: [
      { v: "none", l: "None" },
      { v: "low_risk", l: "Low-Risk Country" },
      { v: "high_risk", l: "High-Risk Country (Iran/Afghanistan/DPRK/Myanmar/Syria)" },
    ],
    pep_status: [
      { v: "not_pep", l: "Not PEP" },
      { v: "pep", l: "PEP" },
      { v: "close_associate_family", l: "Family Member / Close Associate" },
    ],
  };

  const LEGAL = {
    entity_type: [
      { v: "private_public_limited_gov", l: "Private/Public Limited / Government" },
      { v: "partnership_llp_sole", l: "Partnership / LLP / Sole Proprietorship" },
      { v: "trust_ngo_waqf", l: "Trust / NGO / Waqf" },
    ],
    country_incorporation: [
      { v: "pakistan", l: "Pakistan" },
      { v: "foreign_low_risk", l: "Foreign (Low-Risk)" },
      { v: "foreign_high_risk", l: "Foreign (High-Risk Country)" },
    ],
    province_registration: [
      { v: "punjab", l: "Punjab" },
      { v: "sindh", l: "Sindh" },
      { v: "kpk", l: "Khyber Pakhtunkhwa" },
      { v: "balochistan", l: "Balochistan" },
      { v: "gilgit_baltistan", l: "Gilgit-Baltistan" },
      { v: "ajk", l: "Azad Jammu & Kashmir" },
      { v: "islamabad", l: "Islamabad Capital Territory" },
      { v: "foreign", l: "Foreign Registered" },
    ],
    pakistan_geography: NATURAL.pakistan_geography,
    business_sector: [
      { v: "manufacturing_services", l: "Manufacturing / Services" },
      { v: "import_export", l: "Import / Export" },
      { v: "real_estate_dpms_cash_intensive_ngo", l: "Real Estate / DPMS / Cash-Intensive / NGO" },
    ],
    ownership_structure: [
      { v: "simple", l: "Simple" },
      { v: "moderate", l: "Moderate" },
      { v: "complex_layered_nominee", l: "Complex / Layered / Nominee" },
    ],
    bo_status: [
      { v: "direct", l: "Direct BO identified" },
      { v: "indirect", l: "Indirect BO" },
      { v: "no_clear_bo", l: "No clear BO (Very High override)" },
    ],
    ubo_country_risk: [
      { v: "pakistan", l: "Pakistan" },
      { v: "foreign_low_risk", l: "Foreign – Low Risk" },
      { v: "foreign_high_risk", l: "Foreign – High Risk" },
    ],
    control_type: [
      { v: "owners_board", l: "Owners / Board" },
      { v: "trustee_settlor", l: "Trustee / Settlor" },
      { v: "nominee_poa", l: "Nominee / POA" },
    ],
    relationship_purpose: [
      { v: "property_transaction", l: "Property transaction" },
      { v: "business_relationship", l: "Business relationship" },
      { v: "company_services", l: "Company / trust services" },
      { v: "other", l: "Other" },
    ],
    source_of_funds: NATURAL.source_of_funds,
    declared_turnover_band: [
      { v: "above_100m", l: "Above PKR 100 Million" },
      { v: "50m_100m", l: "PKR 50 – 100 Million" },
      { v: "10m_50m", l: "PKR 10 – 50 Million" },
      { v: "5m_10m", l: "PKR 5 – 10 Million" },
      { v: "below_5m", l: "Below PKR 5 Million" },
      { v: "non_filer", l: "Non-Filer" },
    ],
    hard_docs_submitted: [
      { v: "yes", l: "Yes" },
      { v: "no", l: "No" },
    ],
  };

  // ---------- UI building blocks (keep the style you liked) ----------
  function SelectField({ label, name, options, helper }) {
    return (
      <div>
        <label className="block text-sm font-extrabold text-slate-800">
          {label} <span className="text-rose-600">*</span>
        </label>
        <select
          name={name}
          value={formData[name] || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Select</option>
          {options.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
        {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
      </div>
    );
  }

  function TextField({ label, name, placeholder, helper, inputMode }) {
    return (
      <div>
        <label className="block text-sm font-extrabold text-slate-800">
          {label} <span className="text-rose-600">*</span>
        </label>
        <input
          type="text"
          name={name}
          value={formData[name] || ""}
          onChange={handleChange}
          inputMode={inputMode}
          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          placeholder={placeholder}
        />
        {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
      </div>
    );
  }

  const NaturalPersonForm = () => (
    <div className="space-y-8">
      <div>
        <div className="mb-4">
          <div className="text-base font-black text-slate-900">2) Customer Details</div>
          <div className="text-sm text-slate-600">Identity and profile details.</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField
            label="CNIC/Passport No"
            name="id_number"
            placeholder="e.g., 35201-1234567-8"
            helper="Used for internal screening and inspection documentation."
          />
          <SelectField
            label="Nationality + Country of Residence"
            name="nationality_residence"
            options={[
              { v: "pakistan_pk", l: "Pakistani (Pakistan)" },
              { v: "pakistan_uae", l: "Pakistani (UAE)" },
              { v: "pakistan_saudi", l: "Pakistani (Saudi Arabia)" },
              { v: "other", l: "Other" },
            ]}
          />
          <SelectField label="Acting Capacity" name="acting_capacity" options={NATURAL.acting_capacity} />
          <SelectField label="Occupation" name="occupation" options={NATURAL.occupation} />
          <SelectField label="Industry/Sector" name="industry_sector" options={NATURAL.industry_sector} />
          <SelectField label="Source of Funds" name="source_of_funds" options={NATURAL.source_of_funds} />
          <SelectField label="Declared Income in FBR Return (latest tax year)" name="declared_income_band" options={NATURAL.declared_income_band} />
          <SelectField label="Purpose of Transaction" name="purpose" options={NATURAL.purpose} />
        </div>
      </div>

      <div>
        <div className="mb-4">
          <div className="text-base font-black text-slate-900">3) Transaction & Risk Inputs</div>
          <div className="text-sm text-slate-600">Used for scoring and inspection documentation.</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField
            label="Exact Transaction Amount (PKR)"
            name="transaction_amount"
            inputMode="numeric"
            placeholder="e.g., 500000"
            helper="Numeric value in PKR."
          />
          <SelectField label="Payment Mode" name="payment_mode" options={NATURAL.payment_mode} />
          <SelectField label="Pakistan Geography" name="pakistan_geography" options={NATURAL.pakistan_geography} />
          <SelectField label="Foreign Exposure" name="foreign_exposure" options={NATURAL.foreign_exposure} />
          <SelectField label="PEP Status" name="pep_status" options={NATURAL.pep_status} />
        </div>
      </div>

      <div>
        <div className="mb-4">
          <div className="text-base font-black text-slate-900">4) Declaration</div>
          <div className="text-sm text-slate-600">Required before report generation.</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent || false}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-800">
                Declaration + Consent <span className="text-rose-600">*</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                I declare that the information provided is true, accurate, and complete to the best of my knowledge, and will be used for internal compliance purposes and inspection evidence.
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  const LegalPersonForm = () => (
    <div className="space-y-8">
      <div>
        <div className="mb-4">
          <div className="text-base font-black text-slate-900">2) Entity Details</div>
          <div className="text-sm text-slate-600">Entity and registration details.</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField label="Entity Type" name="entity_type" options={LEGAL.entity_type} />
          <SelectField label="Country of Incorporation" name="country_incorporation" options={LEGAL.country_incorporation} />
          <SelectField label="Province/Area Registration" name="province_registration" options={LEGAL.province_registration} />
          <SelectField label="Pakistan Geography" name="pakistan_geography" options={LEGAL.pakistan_geography} />
          <SelectField label="Business Sector" name="business_sector" options={LEGAL.business_sector} />
          <SelectField label="Ownership Structure" name="ownership_structure" options={LEGAL.ownership_structure} />
          <SelectField label="Beneficial Ownership Status" name="bo_status" options={LEGAL.bo_status} />
          <SelectField label="UBO Country Risk" name="ubo_country_risk" options={LEGAL.ubo_country_risk} />
        </div>
      </div>

      <div>
        <div className="mb-4">
          <div className="text-base font-black text-slate-900">3) Control, Transaction & Risk Inputs</div>
          <div className="text-sm text-slate-600">Used for scoring and inspection documentation.</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField label="Control Type" name="control_type" options={LEGAL.control_type} />
          <SelectField label="Purpose of Relationship" name="relationship_purpose" options={LEGAL.relationship_purpose} />
          <TextField
            label="Exact Transaction Amount (PKR)"
            name="transaction_amount"
            inputMode="numeric"
            placeholder="e.g., 5000000"
            helper="Numeric value in PKR."
          />
          <SelectField label="Source of Funds" name="source_of_funds" options={LEGAL.source_of_funds} />
          <SelectField label="Declared Turnover in FBR Return (latest tax year)" name="declared_turnover_band" options={LEGAL.declared_turnover_band} />
          <SelectField label="Hard documents submitted?" name="hard_docs_submitted" options={LEGAL.hard_docs_submitted} helper="If ‘No’, acceptance will later be blocked for inspection controls." />
        </div>
      </div>

      <div>
        <div className="mb-4">
          <div className="text-base font-black text-slate-900">4) Declaration</div>
          <div className="text-sm text-slate-600">Required before report generation.</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent || false}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-800">
                Declaration + Consent <span className="text-rose-600">*</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                I declare that the information provided is true, accurate, and complete to the best of my knowledge, and will be used for internal compliance purposes and inspection evidence.
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell title="CDD / KYC / EDD">
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8">

          {/* Main Card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
              <div className="text-sm font-extrabold text-slate-900">Customer Due Diligence</div>
              <div className="mt-1 text-xs text-slate-600">
                Inspection-safe workflow. This system does not submit anything to regulators. Final decisions remain subject to human review and approval.
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Section 1: Customer Type */}
              <div>
                <div className="mb-4">
                  <div className="text-base font-black text-slate-900">1) Customer Type</div>
                  <div className="text-sm text-slate-600">Select Natural Person or Legal Person.</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-extrabold text-slate-800">
                      Nature of Customer <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={customerType}
                      onChange={handleCustomerTypeChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">Select customer type</option>
                      <option value="natural">Natural Person</option>
                      <option value="legal">Legal Person</option>
                    </select>
                    <div className="mt-1 text-xs text-slate-500">
                      This selection determines which form you will need to complete.
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Forms */}
              {customerType === "natural" ? <NaturalPersonForm /> : null}
              {customerType === "legal" ? <LegalPersonForm /> : null}
            </div>
          </div>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-4 mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Generate CDD/KYC Report</div>
                  <div className="text-xs text-slate-600">
                    Generates a printable report (later). No regulator submission is performed.
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={saving}
                  className={`rounded-xl px-5 py-3 text-sm font-black text-white shadow-sm
                    ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"}
                  `}
                >
                  {saving ? "Processing…" : "Generate CDD/KYC Report"}
                </button>
              </div>

              {saveError ? (
                <div className="mt-3 text-sm font-bold text-rose-700">
                  {saveError}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
