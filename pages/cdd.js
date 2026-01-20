import { useState } from "react";
import { supabase } from "../utils/supabase";
import AppShell from "../components/AppShell";

export default function CddPage() {
  // Step 7.3 — State
  const [customerType, setCustomerType] = useState(""); // "natural" | "legal"
  const [formData, setFormData] = useState({});
  
  // Step 8.3 — New state for saving
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Helper function for setting form fields
  function setField(key, value) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // Updated handleChange function
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // Handle customer type change
  const handleCustomerTypeChange = (e) => {
    const newType = e.target.value;
    setCustomerType(newType);
    // Reset formData only when customer type changes
    setFormData({});
  };

  // Step 8.2 — Required-field validation
  function validateCdd({ customerType, formData }) {
    const missing = [];

    function req(key, label) {
      const v = formData?.[key];
      const ok =
        v !== undefined &&
        v !== null &&
        String(v).trim() !== "" &&
        v !== false; // for consent checkbox
      if (!ok) missing.push(label);
    }

    req("nature_of_customer", "Nature of Customer");

    if (customerType === "natural") {
      req("id_number", "CNIC/Passport No");
      req("nationality_residence", "Nationality + Country of Residence");
      req("acting_capacity", "Acting Capacity");
      req("occupation", "Occupation");
      req("industry_sector", "Industry/Sector");
      req("source_of_funds", "Source of Funds");
      req("declared_income_band", "Declared Income (FBR)");
      req("purpose", "Purpose of Transaction");
      req("transaction_amount", "Transaction Amount");
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
      req("transaction_amount", "Transaction Amount");
      req("source_of_funds", "Source of Funds");
      req("declared_turnover_band", "Declared Turnover (FBR)");
      req("hard_docs_submitted", "Hard documents submitted?");
      req("consent", "Declaration + Consent"); // still required
    }

    // numeric check
    if (formData?.transaction_amount && isNaN(Number(formData.transaction_amount))) {
      missing.push("Transaction Amount must be numeric");
    }

    return missing;
  }

  // Step 8.3 — Create the "Generate" click handler
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

      // ensure we store nature field consistently
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

      // Redirect to a case page (we'll build in Step 9)
      window.location.href = `/cdd/cases/${data.id}`;
    } catch (e) {
      console.error(e);
      setSaveError(e?.message || "Failed to save CDD case.");
      alert(e?.message || "Failed to save CDD case.");
    } finally {
      setSaving(false);
    }
  }

  // Natural Person Form Component
  const NaturalPersonForm = () => {
    return (
      <div className="space-y-8">
        {/* Section 2: Customer Details */}
        <div>
          <div className="mb-4">
            <div className="text-base font-black text-slate-900">2) Customer Details</div>
            <div className="text-sm text-slate-600">Provide identity and profile details.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CNIC/Passport No */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                CNIC/Passport No <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="id_number"
                value={formData.id_number || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="e.g., 35201-1234567-8"
                required
              />
              <div className="mt-1 text-xs text-slate-500">
                Used for internal screening and inspection documentation.
              </div>
            </div>

            {/* Nationality + Country of Residence */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Nationality + Country of Residence <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="nationality_residence"
                value={formData.nationality_residence || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="e.g., Pakistani, UAE"
                required
              />
              <div className="mt-1 text-xs text-slate-500">
                Nationality followed by current country of residence.
              </div>
            </div>

            {/* Acting Capacity */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Acting Capacity <span className="text-rose-600">*</span>
              </label>
              <select
                name="acting_capacity"
                value={formData.acting_capacity || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select acting capacity</option>
                <option value="self">Self</option>
                <option value="power_of_attorney">Power of Attorney</option>
                <option value="guardian">Legal Guardian</option>
                <option value="representative">Authorized Representative</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                How the person is acting in this transaction.
              </div>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Occupation <span className="text-rose-600">*</span>
              </label>
              <select
                name="occupation"
                value={formData.occupation || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select occupation</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-Employed</option>
                <option value="business_owner">Business Owner</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
                <option value="unemployed">Unemployed</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Primary occupation status.
              </div>
            </div>

            {/* Industry/Sector */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Industry/Sector <span className="text-rose-600">*</span>
              </label>
              <select
                name="industry_sector"
                value={formData.industry_sector || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select industry/sector</option>
                <option value="banking_finance">Banking & Finance</option>
                <option value="real_estate">Real Estate</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="government">Government</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Industry sector of employment/business.
              </div>
            </div>

            {/* Declared Income Band */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Declared Income (FBR) <span className="text-rose-600">*</span>
              </label>
              <select
                name="declared_income_band"
                value={formData.declared_income_band || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select income band</option>
                <option value="low">Low (Below $30k)</option>
                <option value="medium">Medium ($30k - $100k)</option>
                <option value="high">High (Above $100k)</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Annual income declared to tax authorities.
              </div>
            </div>

            {/* Source of Funds */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Source of Funds <span className="text-rose-600">*</span>
              </label>
              <select
                name="source_of_funds"
                value={formData.source_of_funds || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select source of funds</option>
                <option value="salary">Salary/Employment</option>
                <option value="business">Business Income</option>
                <option value="investment">Investment Returns</option>
                <option value="inheritance">Inheritance</option>
                <option value="gift">Gift</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Primary origin of the transaction funds.
              </div>
            </div>

            {/* Purpose of Transaction */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Purpose of Transaction <span className="text-rose-600">*</span>
              </label>
              <select
                name="purpose"
                value={formData.purpose || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select purpose</option>
                <option value="personal_savings">Personal Savings</option>
                <option value="business_investment">Business Investment</option>
                <option value="property_purchase">Property Purchase</option>
                <option value="education">Education</option>
                <option value="medical">Medical Expenses</option>
                <option value="family_support">Family Support</option>
                <option value="travel">Travel</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Reason for this specific transaction.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Transaction & Risk Inputs */}
        <div>
          <div className="mb-4">
            <div className="text-base font-black text-slate-900">3) Transaction & Risk Inputs</div>
            <div className="text-sm text-slate-600">
              Used for internal scoring and inspection documentation.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transaction Amount */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Transaction Amount <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="transaction_amount"
                value={formData.transaction_amount || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="e.g., 500000"
                required
              />
              <div className="mt-1 text-xs text-slate-500">
                Numeric value in PKR.
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Payment Mode <span className="text-rose-600">*</span>
              </label>
              <select
                name="payment_mode"
                value={formData.payment_mode || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select payment mode</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="digital_wallet">Digital Wallet</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Method of payment for this transaction.
              </div>
            </div>

            {/* Pakistan Geography */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Pakistan Geography <span className="text-rose-600">*</span>
              </label>
              <select
                name="pakistan_geography"
                value={formData.pakistan_geography || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select location</option>
                <option value="punjab">Punjab</option>
                <option value="sindh">Sindh</option>
                <option value="kpk">Khyber Pakhtunkhwa</option>
                <option value="balochistan">Balochistan</option>
                <option value="gilgit_baltistan">Gilgit-Baltistan</option>
                <option value="ajk">Azad Jammu & Kashmir</option>
                <option value="islamabad">Islamabad Capital Territory</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Geographic location within Pakistan.
              </div>
            </div>

            {/* Foreign Exposure */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Foreign Exposure <span className="text-rose-600">*</span>
              </label>
              <select
                name="foreign_exposure"
                value={formData.foreign_exposure || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select foreign exposure</option>
                <option value="none">None</option>
                <option value="resident_abroad">Resident Abroad</option>
                <option value="frequent_travel">Frequent International Travel</option>
                <option value="foreign_bank_account">Foreign Bank Account</option>
                <option value="foreign_business">Foreign Business Interests</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                International connections or activities.
              </div>
            </div>

            {/* PEP Status */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                PEP Status <span className="text-rose-600">*</span>
              </label>
              <select
                name="pep_status"
                value={formData.pep_status || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select PEP status</option>
                <option value="not_pep">Not a PEP</option>
                <option value="current_pep">Current PEP</option>
                <option value="former_pep">Former PEP</option>
                <option value="family_member">Family Member of PEP</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Politically Exposed Person status.
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Declaration */}
        <div>
          <div className="mb-4">
            <div className="text-base font-black text-slate-900">4) Declaration</div>
            <div className="text-sm text-slate-600">
              Required before report generation.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent || false}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                  required
                />
              </div>
              <div className="ml-3">
                <label className="text-sm font-extrabold text-slate-800">
                  Declaration & Consent <span className="text-rose-600">*</span>
                </label>
                <p className="mt-1 text-sm text-slate-600">
                  I declare that the information provided is true, accurate, and complete to the best of my knowledge. I understand that this information will be used for internal compliance purposes and may be presented during regulatory inspections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Legal Person Form Component
  const LegalPersonForm = () => {
    return (
      <div className="space-y-8">
        {/* Section 2: Customer Details */}
        <div>
          <div className="mb-4">
            <div className="text-base font-black text-slate-900">2) Customer Details</div>
            <div className="text-sm text-slate-600">Provide entity and registration details.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity Type */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Entity Type <span className="text-rose-600">*</span>
              </label>
              <select
                name="entity_type"
                value={formData.entity_type || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select entity type</option>
                <option value="sole_proprietorship">Sole Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited Company</option>
                <option value="public_limited">Public Limited Company</option>
                <option value="non_profit">Non-Profit Organization</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Legal structure of the entity.
              </div>
            </div>

            {/* Country of Incorporation */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Country of Incorporation <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="country_incorporation"
                value={formData.country_incorporation || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="e.g., Pakistan"
                required
              />
              <div className="mt-1 text-xs text-slate-500">
                Country where entity is legally registered.
              </div>
            </div>

            {/* Province/Area Registration */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Province/Area Registration <span className="text-rose-600">*</span>
              </label>
              <select
                name="province_registration"
                value={formData.province_registration || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select province/area</option>
                <option value="punjab">Punjab</option>
                <option value="sindh">Sindh</option>
                <option value="kpk">Khyber Pakhtunkhwa</option>
                <option value="balochistan">Balochistan</option>
                <option value="gilgit_baltistan">Gilgit-Baltistan</option>
                <option value="ajk">Azad Jammu & Kashmir</option>
                <option value="islamabad">Islamabad Capital Territory</option>
                <option value="foreign">Foreign Registered</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Registration jurisdiction within Pakistan.
              </div>
            </div>

            {/* Pakistan Geography */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Pakistan Geography <span className="text-rose-600">*</span>
              </label>
              <select
                name="pakistan_geography"
                value={formData.pakistan_geography || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select location</option>
                <option value="punjab">Punjab</option>
                <option value="sindh">Sindh</option>
                <option value="kpk">Khyber Pakhtunkhwa</option>
                <option value="balochistan">Balochistan</option>
                <option value="gilgit_baltistan">Gilgit-Baltistan</option>
                <option value="ajk">Azad Jammu & Kashmir</option>
                <option value="islamabad">Islamabad Capital Territory</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Geographic location of primary operations.
              </div>
            </div>

            {/* Business Sector */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Business Sector <span className="text-rose-600">*</span>
              </label>
              <select
                name="business_sector"
                value={formData.business_sector || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select business sector</option>
                <option value="banking_finance">Banking & Finance</option>
                <option value="real_estate">Real Estate</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail_trade">Retail Trade</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="import_export">Import/Export</option>
                <option value="construction">Construction</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Primary industry sector of operations.
              </div>
            </div>

            {/* Ownership Structure */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Ownership Structure <span className="text-rose-600">*</span>
              </label>
              <select
                name="ownership_structure"
                value={formData.ownership_structure || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select ownership structure</option>
                <option value="sole">Sole Ownership</option>
                <option value="partnership">Partnership</option>
                <option value="shareholding">Shareholding</option>
                <option value="trust">Trust</option>
                <option value="foundation">Foundation</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Legal ownership arrangement.
              </div>
            </div>

            {/* Beneficial Ownership Status */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Beneficial Ownership Status <span className="text-rose-600">*</span>
              </label>
              <select
                name="bo_status"
                value={formData.bo_status || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select BO status</option>
                <option value="identified">Identified</option>
                <option value="not_identified">Not Identified</option>
                <option value="exempt">Exempt</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Status of beneficial ownership identification.
              </div>
            </div>

            {/* UBO Country Risk */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                UBO Country Risk <span className="text-rose-600">*</span>
              </label>
              <select
                name="ubo_country_risk"
                value={formData.ubo_country_risk || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select UBO country risk</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="unknown">Unknown</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Risk rating of ultimate beneficial owner's country.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Transaction & Risk Inputs */}
        <div>
          <div className="mb-4">
            <div className="text-base font-black text-slate-900">3) Transaction & Risk Inputs</div>
            <div className="text-sm text-slate-600">
              Used for internal scoring and inspection documentation.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Control Type */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Control Type <span className="text-rose-600">*</span>
              </label>
              <select
                name="control_type"
                value={formData.control_type || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select control type</option>
                <option value="direct">Direct Control</option>
                <option value="indirect">Indirect Control</option>
                <option value="joint">Joint Control</option>
                <option value="no_control">No Control</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Type of control over the entity.
              </div>
            </div>

            {/* Purpose of Relationship */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Purpose of Relationship <span className="text-rose-600">*</span>
              </label>
              <select
                name="relationship_purpose"
                value={formData.relationship_purpose || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select purpose</option>
                <option value="banking">Banking Services</option>
                <option value="investment">Investment</option>
                <option value="trade_finance">Trade Finance</option>
                <option value="property">Property Transaction</option>
                <option value="corporate">Corporate Services</option>
                <option value="other">Other</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Reason for establishing this business relationship.
              </div>
            </div>

            {/* Declared Turnover Band */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Declared Turnover (FBR) <span className="text-rose-600">*</span>
              </label>
              <select
                name="declared_turnover_band"
                value={formData.declared_turnover_band || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select turnover band</option>
                <option value="micro">Micro (Below $100k)</option>
                <option value="small">Small ($100k - $1M)</option>
                <option value="medium">Medium ($1M - $10M)</option>
                <option value="large">Large (Above $10M)</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Annual turnover declared to tax authorities.
              </div>
            </div>

            {/* Transaction Amount */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Transaction Amount <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="transaction_amount"
                value={formData.transaction_amount || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="e.g., 5000000"
                required
              />
              <div className="mt-1 text-xs text-slate-500">
                Numeric value in PKR for this transaction.
              </div>
            </div>

            {/* Source of Funds */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800">
                Source of Funds <span className="text-rose-600">*</span>
              </label>
              <select
                name="source_of_funds"
                value={formData.source_of_funds || ""}
                onChange={handleChange}
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Select source of funds</option>
                <option value="revenue">Business Revenue</option>
                <option value="investment">Investment</option>
                <option value="loan">Loan/Credit</option>
                <option value="capital_injection">Capital Injection</option>
                <option value="grants">Grants/Funding</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">
                Primary origin of the transaction funds.
              </div>
            </div>

            {/* Hard documents submitted? */}
            <div className="md:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      name="hard_docs_submitted"
                      checked={formData.hard_docs_submitted || false}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                      required
                    />
                  </div>
                  <div className="ml-3">
                    <label className="text-sm font-extrabold text-slate-800">
                      Hard Documents Submitted & Verified <span className="text-rose-600">*</span>
                    </label>
                    <p className="mt-1 text-sm text-slate-600">
                      All required hardcopy documents (registration certificates, ownership documents, board resolutions, etc.) have been physically submitted, reviewed, and verified.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Declaration */}
        <div>
          <div className="mb-4">
            <div className="text-base font-black text-slate-900">4) Declaration</div>
            <div className="text-sm text-slate-600">
              Required before report generation.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent || false}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                  required
                />
              </div>
              <div className="ml-3">
                <label className="text-sm font-extrabold text-slate-800">
                  Declaration & Consent <span className="text-rose-600">*</span>
                </label>
                <p className="mt-1 text-sm text-slate-600">
                  I declare that the information provided is true, accurate, and complete to the best of my knowledge. I understand that this information will be used for internal compliance purposes and may be presented during regulatory inspections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell title="CDD / KYC / EDD">
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                CDD / KYC / EDD
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                Inspection-safe workflow. No automatic filings. Final decisions require human review and approval.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href="/dashboard"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                Dashboard
              </a>
              <button
                onClick={() => window.history.back()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </div>

          {/* Main Card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
              <div className="text-sm font-extrabold text-slate-900">Customer Due Diligence</div>
              <div className="mt-1 text-xs text-slate-600">
                Complete the required fields. The report can be printed and stored for inspection evidence.
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Section 1: Customer Type */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <div className="text-base font-black text-slate-900">1) Customer Type</div>
                    <div className="text-sm text-slate-600">Select Natural Person or Legal Person.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-extrabold text-slate-800">
                      Nature of Customer <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={customerType}
                      onChange={handleCustomerTypeChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      required
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
              {customerType === "natural" && <NaturalPersonForm />}
              {customerType === "legal" && <LegalPersonForm />}
            </div>
          </div>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-4 mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-4 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Generate CDD/KYC Report</div>
                  <div className="text-xs text-slate-600">
                    Generates a printable report. No regulator submission is performed.
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
