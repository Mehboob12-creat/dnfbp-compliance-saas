import { useMemo, useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

/**
 * IMPORTANT:
 * - Text/number inputs use: defaultValue + onBlur (prevents focus-loss / one-character bug)
 * - Selects use: value + onChange (fine for dropdowns)
 * - Checkboxes use: checked + onChange
 *
 * DB safety:
 * - customerType stored as "natural" | "legal" (fixes cdd_cases_customer_type_check)
 */

export default function CddPage() {
  // DB-safe values
  const [customerType, setCustomerType] = useState(""); // "natural" | "legal"
  const [formData, setFormData] = useState({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ---------- shared helpers ----------
  function setField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // For selects + checkboxes only
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // For text/number inputs (prevents 1-char bug)
  function onBlurField(name) {
    return (e) => {
      const v = e?.target?.value ?? "";
      setFormData((prev) => ({ ...prev, [name]: v }));
    };
  }

  const handleCustomerTypeChange = (e) => {
    const newType = e.target.value;
    setCustomerType(newType);
    setFormData({}); // reset when switching types
    setSaveError("");
  };

  // ---------- dropdown options (expanded, risk-ready later) ----------
  const OPTIONS = useMemo(() => {
    return {
      nationalityResidence: [
        "Pakistan — Pakistan",
        "Pakistan — UAE",
        "Pakistan — Saudi Arabia",
        "Pakistan — Qatar",
        "Pakistan — UK",
        "Pakistan — USA",
        "Pakistan — Canada",
        "Pakistan — Malaysia",
        "Afghanistan — Pakistan",
        "Iran — Pakistan",
        "Other — Foreign",
      ],
      actingCapacity: [
        { v: "self", t: "Self" },
        { v: "on_behalf", t: "On behalf (representative / agent)" },
      ],
      occupation: [
        { v: "salaried_professional", t: "Salaried / Professional" },
        { v: "business_owner", t: "Business Owner / Self-employed" },
        { v: "unemployed_other", t: "Unemployed / Other" },
        { v: "public_office_holder", t: "Politician / Public Office Holder (PEP risk)" },
      ],
      industrySector: [
        { v: "manufacturing_services", t: "Manufacturing / Services" },
        { v: "import_export", t: "Import / Export" },
        { v: "real_estate", t: "Real Estate" },
        { v: "dpms", t: "Dealer in Precious Metals & Stones (DPMS)" },
        { v: "cash_intensive", t: "Cash-intensive business" },
        { v: "ngo_charity", t: "NGO / Charity-related" },
        { v: "other", t: "Other" },
      ],
      sourceOfFunds: [
        { v: "salary_business_income", t: "Salary / Business Income" },
        { v: "sale_asset_inheritance_loan", t: "Sale of Asset / Inheritance / Bank Loan" },
        { v: "private_loan", t: "Private Loan" },
        { v: "gift_other", t: "Gift / Other" },
      ],
      incomeBand: [
        { v: "above_10m", t: "Above PKR 10 Million" },
        { v: "5m_10m", t: "PKR 5 – 10 Million" },
        { v: "3m_5m", t: "PKR 3 – 5 Million" },
        { v: "1m_3m", t: "PKR 1 – 3 Million" },
        { v: "below_1m", t: "Below PKR 1 Million" },
        { v: "non_filer", t: "Non-Filer" },
      ],
      purpose: [
        { v: "property_purchase", t: "Property purchase / sale" },
        { v: "investment", t: "Investment" },
        { v: "business_expansion", t: "Business expansion" },
        { v: "personal_savings", t: "Personal savings / asset purchase" },
        { v: "family_support", t: "Family support" },
        { v: "other", t: "Other" },
      ],
      paymentMode: [
        { v: "bank", t: "Bank Transfer" },
        { v: "cheque", t: "Cheque" },
        { v: "mixed", t: "Mixed" },
        { v: "cash", t: "Cash" },
      ],
      pakistanGeo: [
        // High-risk (from your spec)
        { v: "bajaur", t: "Bajaur (KP Border)" },
        { v: "mohmand", t: "Mohmand (KP Border)" },
        { v: "khyber", t: "Khyber (KP Border)" },
        { v: "kurram", t: "Kurram (KP Border)" },
        { v: "orakzai", t: "Orakzai (KP Border)" },
        { v: "north_waziristan", t: "North Waziristan (KP Border)" },
        { v: "south_waziristan", t: "South Waziristan (KP Border)" },
        { v: "chaman", t: "Chaman (Balochistan Border)" },
        { v: "nushki", t: "Nushki (Balochistan Border)" },
        { v: "panjgur", t: "Panjgur (Balochistan Border)" },
        { v: "washuk", t: "Washuk (Balochistan Border)" },
        { v: "kech_turbat", t: "Kech/Turbat (Balochistan Border)" },
        { v: "gwadar", t: "Gwadar (Balochistan Border)" },
        { v: "bahawalpur", t: "Bahawalpur (South Punjab)" },
        { v: "rahim_yar_khan", t: "Rahim Yar Khan (South Punjab)" },
        { v: "bahawalnagar", t: "Bahawalnagar (South Punjab)" },
        { v: "dera_ghazi_khan", t: "Dera Ghazi Khan (South Punjab)" },
        { v: "rajanpur", t: "Rajanpur (South Punjab)" },
        { v: "muzaffargarh", t: "Muzaffargarh (South Punjab)" },
        { v: "layyah", t: "Layyah (South Punjab)" },
        { v: "bhakkar", t: "Bhakkar (South Punjab)" },

        // major cities
        { v: "karachi", t: "Karachi" },
        { v: "quetta", t: "Quetta" },
        { v: "peshawar", t: "Peshawar" },

        // other
        { v: "other_pk", t: "Other Pakistan location" },
      ],
      foreignExposure: [
        { v: "none", t: "None" },
        { v: "low_risk", t: "Low-risk country exposure" },
        { v: "high_risk", t: "High-risk country exposure (e.g., Iran, Afghanistan, DPRK, Myanmar, Syria)" },
      ],
      pep: [
        { v: "not_pep", t: "Not PEP" },
        { v: "pep", t: "PEP" },
        { v: "rca", t: "Close associate / family member" },
      ],

      // Legal person
      entityType: [
        { v: "private_limited", t: "Private Limited" },
        { v: "public_limited", t: "Public Limited" },
        { v: "government", t: "Government / State-owned" },
        { v: "partnership", t: "Partnership / LLP" },
        { v: "sole_proprietorship", t: "Sole Proprietorship" },
        { v: "trust_ngo_waqf", t: "Trust / NGO / Waqf" },
      ],
      countryIncorp: [
        "Pakistan",
        "UAE",
        "Saudi Arabia",
        "Qatar",
        "UK",
        "USA",
        "Canada",
        "Malaysia",
        "Other (Low-risk)",
        "High-risk (Iran/Afghanistan/DPRK/Myanmar/Syria)",
      ],
      provinceReg: [
        { v: "punjab", t: "Punjab" },
        { v: "sindh", t: "Sindh" },
        { v: "kpk", t: "Khyber Pakhtunkhwa" },
        { v: "balochistan", t: "Balochistan" },
        { v: "gb", t: "Gilgit-Baltistan" },
        { v: "ajk", t: "Azad Jammu & Kashmir" },
        { v: "islamabad", t: "Islamabad Capital Territory" },
        { v: "foreign", t: "Foreign Registered" },
      ],
      businessSectorLegal: [
        { v: "manufacturing_services", t: "Manufacturing / Services" },
        { v: "import_export", t: "Import / Export" },
        { v: "real_estate", t: "Real Estate" },
        { v: "dpms", t: "DPMS / Precious Metals & Stones" },
        { v: "cash_intensive", t: "Cash-intensive / high volume" },
        { v: "ngo", t: "NGO / Charity" },
        { v: "other", t: "Other" },
      ],
      ownershipStructure: [
        { v: "simple", t: "Simple" },
        { v: "moderate", t: "Moderate" },
        { v: "complex", t: "Complex / layered / nominee" },
      ],
      boStatus: [
        { v: "direct", t: "Direct" },
        { v: "indirect", t: "Indirect" },
        { v: "no_clear_bo", t: "No clear BO" },
      ],
      uboCountryRisk: [
        { v: "pakistan", t: "Pakistan" },
        { v: "foreign_low", t: "Foreign – Low Risk" },
        { v: "foreign_high", t: "Foreign – High Risk" },
      ],
      controlType: [
        { v: "owners_board", t: "Owners / Board" },
        { v: "trustee_settlor", t: "Trustee / Settlor" },
        { v: "nominee_poa", t: "Nominee / POA" },
      ],
      relationshipPurpose: [
        { v: "property_transaction", t: "Property transaction / sale-purchase" },
        { v: "company_services", t: "Company services / advisory" },
        { v: "ongoing_relationship", t: "Ongoing business relationship" },
        { v: "one_off", t: "One-off transaction" },
        { v: "other", t: "Other" },
      ],
      turnoverBand: [
        { v: "above_100m", t: "Above PKR 100 Million" },
        { v: "50m_100m", t: "PKR 50 – 100 Million" },
        { v: "10m_50m", t: "PKR 10 – 50 Million" },
        { v: "5m_10m", t: "PKR 5 – 10 Million" },
        { v: "below_5m", t: "Below PKR 5 Million" },
        { v: "non_filer", t: "Non-Filer" },
      ],
      hardDocs: [
        { v: "yes", t: "Yes" },
        { v: "no", t: "No" },
      ],
    };
  }, []);

  // ---------- validation ----------
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

    // customerType itself
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

    // numeric check (only if present)
    if (formData?.transaction_amount) {
      const n = Number(String(formData.transaction_amount).replace(/,/g, ""));
      if (Number.isNaN(n)) missing.push("Transaction Amount must be numeric");
    }

    return missing;
  }

  // ---------- save + redirect ----------
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
        nature_of_customer: customerType, // DB-safe label
      };

      const { data, error } = await supabase
        .from("cdd_cases")
        .insert([
          {
            user_id: userId,
            customer_type: customerType, // IMPORTANT: "natural" or "legal" (lowercase)
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

  // ---------- UI primitives ----------
  function Section({ title, desc, children }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
          {desc ? <div className="mt-1 text-xs text-slate-600">{desc}</div> : null}
        </div>
        <div className="p-6">{children}</div>
      </div>
    );
  }

  function Field({ label, req, hint, children }) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-extrabold text-slate-800">
          {label} {req ? <span className="text-rose-600">*</span> : null}
        </label>
        {children}
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>
    );
  }

  function Select({ name, value, onChange, options, placeholder = "Select…" }) {
    return (
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          if (typeof o === "string") return <option key={o} value={o}>{o}</option>;
          return <option key={o.v} value={o.v}>{o.t}</option>;
        })}
      </select>
    );
  }

  function TextInput({ name, placeholder, type = "text" }) {
    return (
      <input
        type={type}
        name={name}
        defaultValue={formData?.[name] || ""}
        onBlur={onBlurField(name)}
        className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        placeholder={placeholder}
      />
    );
  }

  // ---------- Forms (All 15 questions each) ----------
  const NaturalPersonForm = () => (
    <div className="space-y-6">
      {/* Customer Details */}
      <Section
        title="Natural Person — Customer Identification"
        desc="Provide identity and profile details required for CDD and inspection recordkeeping."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="CNIC / Passport No" req hint="Used for internal screening and inspection documentation.">
            <TextInput name="id_number" placeholder="e.g., 35201-1234567-8" />
          </Field>

          <Field label="Nationality + Country of Residence" req>
            <Select
              name="nationality_residence"
              value={formData.nationality_residence}
              onChange={handleChange}
              options={OPTIONS.nationalityResidence}
              placeholder="Select nationality + residence"
            />
          </Field>

          <Field label="Acting Capacity" req>
            <Select
              name="acting_capacity"
              value={formData.acting_capacity}
              onChange={handleChange}
              options={OPTIONS.actingCapacity}
              placeholder="Select acting capacity"
            />
          </Field>

          <Field label="Occupation" req>
            <Select
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              options={OPTIONS.occupation}
              placeholder="Select occupation"
            />
          </Field>

          <Field label="Industry / Sector" req>
            <Select
              name="industry_sector"
              value={formData.industry_sector}
              onChange={handleChange}
              options={OPTIONS.industrySector}
              placeholder="Select industry/sector"
            />
          </Field>

          <Field label="Source of Funds" req>
            <Select
              name="source_of_funds"
              value={formData.source_of_funds}
              onChange={handleChange}
              options={OPTIONS.sourceOfFunds}
              placeholder="Select source of funds"
            />
          </Field>

          <Field label="Declared Income in FBR Return (latest tax year)" req>
            <Select
              name="declared_income_band"
              value={formData.declared_income_band}
              onChange={handleChange}
              options={OPTIONS.incomeBand}
              placeholder="Select income band"
            />
          </Field>

          <Field label="Purpose of Transaction" req>
            <Select
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              options={OPTIONS.purpose}
              placeholder="Select purpose"
            />
          </Field>
        </div>
      </Section>

      {/* Transaction & Risk Inputs */}
      <Section
        title="Natural Person — Transaction & Risk Inputs"
        desc="Used for risk scoring, recommendations, and inspection evidence."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Exact Transaction Amount (PKR)" req hint="Numbers only (e.g., 5000000).">
            <TextInput name="transaction_amount" placeholder="e.g., 5000000" type="text" />
          </Field>

          <Field label="Payment Mode" req>
            <Select
              name="payment_mode"
              value={formData.payment_mode}
              onChange={handleChange}
              options={OPTIONS.paymentMode}
              placeholder="Select payment mode"
            />
          </Field>

          <Field label="Pakistan Geography" req>
            <Select
              name="pakistan_geography"
              value={formData.pakistan_geography}
              onChange={handleChange}
              options={OPTIONS.pakistanGeo}
              placeholder="Select location"
            />
          </Field>

          <Field label="Foreign Exposure" req>
            <Select
              name="foreign_exposure"
              value={formData.foreign_exposure}
              onChange={handleChange}
              options={OPTIONS.foreignExposure}
              placeholder="Select exposure"
            />
          </Field>

          <Field label="PEP Status" req>
            <Select
              name="pep_status"
              value={formData.pep_status}
              onChange={handleChange}
              options={OPTIONS.pep}
              placeholder="Select PEP status"
            />
          </Field>
        </div>
      </Section>

      {/* Declaration */}
      <Section
        title="Declaration + Consent"
        desc="Required before report generation."
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent || false}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-800">
                I declare that the information provided is true and complete. <span className="text-rose-600">*</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                This system supports internal compliance recordkeeping and inspection preparation.
                It does not submit anything to regulators.
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );

  const LegalPersonForm = () => (
    <div className="space-y-6">
      {/* Entity Details */}
      <Section
        title="Legal Person — Entity Details"
        desc="Provide entity registration and risk-structure details required for CDD and inspection recordkeeping."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Entity Type" req>
            <Select
              name="entity_type"
              value={formData.entity_type}
              onChange={handleChange}
              options={OPTIONS.entityType}
              placeholder="Select entity type"
            />
          </Field>

          <Field label="Country of Incorporation" req>
            <Select
              name="country_incorporation"
              value={formData.country_incorporation}
              onChange={handleChange}
              options={OPTIONS.countryIncorp}
              placeholder="Select country"
            />
          </Field>

          <Field label="Province / Area Registration" req>
            <Select
              name="province_registration"
              value={formData.province_registration}
              onChange={handleChange}
              options={OPTIONS.provinceReg}
              placeholder="Select province/area"
            />
          </Field>

          <Field label="Pakistan Geography" req>
            <Select
              name="pakistan_geography"
              value={formData.pakistan_geography}
              onChange={handleChange}
              options={OPTIONS.pakistanGeo}
              placeholder="Select location"
            />
          </Field>

          <Field label="Business Sector" req>
            <Select
              name="business_sector"
              value={formData.business_sector}
              onChange={handleChange}
              options={OPTIONS.businessSectorLegal}
              placeholder="Select sector"
            />
          </Field>

          <Field label="Ownership Structure" req>
            <Select
              name="ownership_structure"
              value={formData.ownership_structure}
              onChange={handleChange}
              options={OPTIONS.ownershipStructure}
              placeholder="Select structure"
            />
          </Field>

          <Field label="Beneficial Ownership Status" req>
            <Select
              name="bo_status"
              value={formData.bo_status}
              onChange={handleChange}
              options={OPTIONS.boStatus}
              placeholder="Select BO status"
            />
          </Field>

          <Field label="UBO Country Risk" req>
            <Select
              name="ubo_country_risk"
              value={formData.ubo_country_risk}
              onChange={handleChange}
              options={OPTIONS.uboCountryRisk}
              placeholder="Select UBO country risk"
            />
          </Field>

          <Field label="Control Type" req>
            <Select
              name="control_type"
              value={formData.control_type}
              onChange={handleChange}
              options={OPTIONS.controlType}
              placeholder="Select control type"
            />
          </Field>

          <Field label="Purpose of Relationship" req>
            <Select
              name="relationship_purpose"
              value={formData.relationship_purpose}
              onChange={handleChange}
              options={OPTIONS.relationshipPurpose}
              placeholder="Select purpose"
            />
          </Field>
        </div>
      </Section>

      {/* Transaction & Financial Capacity */}
      <Section
        title="Legal Person — Transaction & Financial Capacity"
        desc="Used for risk scoring, recommendations, and inspection evidence."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Exact Transaction Amount (PKR)" req hint="Numbers only (e.g., 5000000).">
            <TextInput name="transaction_amount" placeholder="e.g., 5000000" type="text" />
          </Field>

          <Field label="Source of Funds" req>
            <Select
              name="source_of_funds"
              value={formData.source_of_funds}
              onChange={handleChange}
              options={OPTIONS.sourceOfFunds}
              placeholder="Select source of funds"
            />
          </Field>

          <Field label="Declared Turnover in FBR Return (latest tax year)" req>
            <Select
              name="declared_turnover_band"
              value={formData.declared_turnover_band}
              onChange={handleChange}
              options={OPTIONS.turnoverBand}
              placeholder="Select turnover band"
            />
          </Field>

          <Field label="Hard documents submitted?" req hint="Mandatory for legal persons before acceptance.">
            <Select
              name="hard_docs_submitted"
              value={formData.hard_docs_submitted}
              onChange={handleChange}
              options={OPTIONS.hardDocs}
              placeholder="Select Yes/No"
            />
          </Field>
        </div>
      </Section>

      {/* Declaration */}
      <Section
        title="Declaration + Consent"
        desc="Required before report generation."
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent || false}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
            />
            <div>
              <div className="text-sm font-extrabold text-slate-800">
                I declare that the information provided is true and complete. <span className="text-rose-600">*</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                This system supports internal compliance recordkeeping and inspection preparation.
                It does not submit anything to regulators.
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );

  return (
    <AppShell title="CDD / KYC / EDD">
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Single header (no duplication, no extra buttons) */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              CDD / KYC / EDD
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-3xl">
              Inspection-safe workflow. This system does not submit anything to regulators.
              Final decisions remain subject to human review and approval.
            </p>
          </div>

          {/* Customer Type selector */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-sm font-extrabold text-slate-900">1) Nature of Customer</div>
              <div className="mt-1 text-xs text-slate-600">
                Select Natural Person or Legal Person to load the correct 15-question form.
              </div>
            </div>
            <div className="p-6">
              <div className="max-w-xl">
                <Field label="Nature of Customer" req>
                  <select
                    value={customerType}
                    onChange={handleCustomerTypeChange}
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Select customer type</option>
                    <option value="natural">Natural Person</option>
                    <option value="legal">Legal Person</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {/* Forms */}
          {customerType === "natural" ? <NaturalPersonForm /> : null}
          {customerType === "legal" ? <LegalPersonForm /> : null}

          {/* Action bar */}
          <div className="sticky bottom-4 mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Generate CDD/KYC Report</div>
                  <div className="text-xs text-slate-600">
                    Saves a CDD case and opens the case page. No regulator submission is performed.
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

          <div className="mt-6 text-xs text-slate-500">
            Note: Screening, risk scoring, and PDF generation will be attached to the case page in the next steps.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
