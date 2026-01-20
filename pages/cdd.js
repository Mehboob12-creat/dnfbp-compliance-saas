import { useState } from "react";
import { supabase } from "../utils/supabase"; // Updated import path

export default function CddPage() {
  // Step 7.3 — State
  const [customerType, setCustomerType] = useState(""); // "natural" | "legal"
  const [formData, setFormData] = useState({});
  
  // Step 8.3 — New state for saving
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Handle customer type change
  const handleCustomerTypeChange = (e) => {
    const newType = e.target.value;
    setCustomerType(newType);
    // Reset formData when customer type changes
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
  const NaturalPersonForm = ({ formData, setFormData }) => {
    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-700">Natural Person Details</h3>
        
        {/* CNIC/Passport No */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            CNIC/Passport No <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="id_number"
            value={formData.id_number || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter CNIC or Passport number"
            required
          />
        </div>

        {/* Nationality + Country of Residence */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nationality + Country of Residence <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nationality_residence"
            value={formData.nationality_residence || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Pakistani, UAE"
            required
          />
        </div>

        {/* Acting Capacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Acting Capacity <span className="text-red-500">*</span>
          </label>
          <select
            name="acting_capacity"
            value={formData.acting_capacity || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select acting capacity</option>
            <option value="self">Self</option>
            <option value="power_of_attorney">Power of Attorney</option>
            <option value="guardian">Legal Guardian</option>
            <option value="representative">Authorized Representative</option>
          </select>
        </div>

        {/* Declared Income Band */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Declared Income (FBR) <span className="text-red-500">*</span>
          </label>
          <select
            name="declared_income_band"
            value={formData.declared_income_band || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select income band</option>
            <option value="low">Low (Below $30k)</option>
            <option value="medium">Medium ($30k - $100k)</option>
            <option value="high">High (Above $100k)</option>
          </select>
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payment Mode <span className="text-red-500">*</span>
          </label>
          <select
            name="payment_mode"
            value={formData.payment_mode || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select payment mode</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="digital_wallet">Digital Wallet</option>
            <option value="crypto">Cryptocurrency</option>
          </select>
        </div>

        {/* PEP Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            PEP Status <span className="text-red-500">*</span>
          </label>
          <select
            name="pep_status"
            value={formData.pep_status || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select PEP status</option>
            <option value="not_pep">Not a PEP</option>
            <option value="current_pep">Current PEP</option>
            <option value="former_pep">Former PEP</option>
            <option value="family_member">Family Member of PEP</option>
          </select>
        </div>

        {/* Transaction Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Transaction Amount <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="transaction_amount"
            value={formData.transaction_amount || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter amount (numeric)"
            required
          />
        </div>

        {/* Source of Funds */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Source of Funds <span className="text-red-500">*</span>
          </label>
          <select
            name="source_of_funds"
            value={formData.source_of_funds || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select source of funds</option>
            <option value="salary">Salary/Employment</option>
            <option value="business">Business Income</option>
            <option value="investment">Investment Returns</option>
            <option value="inheritance">Inheritance</option>
            <option value="gift">Gift</option>
          </select>
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required
            />
          </div>
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">
              Declaration + Consent <span className="text-red-500">*</span>
            </label>
            <p className="text-gray-500">
              I declare that the information provided is true and complete to the best of my knowledge.
            </p>
          </div>
        </div>

        {/* Placeholder for remaining questions */}
        <div className="space-y-6">
          <p className="text-sm text-gray-500 italic">
            [Additional natural person questions: Occupation, Industry/Sector, Purpose of Transaction, Pakistan Geography, Foreign Exposure]
          </p>
        </div>
      </div>
    );
  };

  // Legal Person Form Component
  const LegalPersonForm = ({ formData, setFormData }) => {
    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-700">Legal Person Details</h3>
        
        {/* Entity Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Entity Type <span className="text-red-500">*</span>
          </label>
          <select
            name="entity_type"
            value={formData.entity_type || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select entity type</option>
            <option value="sole_proprietorship">Sole Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private Limited Company</option>
            <option value="public_limited">Public Limited Company</option>
            <option value="non_profit">Non-Profit Organization</option>
          </select>
        </div>

        {/* Country of Incorporation */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Country of Incorporation <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="country_incorporation"
            value={formData.country_incorporation || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter country"
            required
          />
        </div>

        {/* Ownership Structure */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ownership Structure <span className="text-red-500">*</span>
          </label>
          <select
            name="ownership_structure"
            value={formData.ownership_structure || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select ownership structure</option>
            <option value="sole">Sole Ownership</option>
            <option value="partnership">Partnership</option>
            <option value="shareholding">Shareholding</option>
            <option value="trust">Trust</option>
            <option value="foundation">Foundation</option>
          </select>
        </div>

        {/* Beneficial Ownership Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Beneficial Ownership Status <span className="text-red-500">*</span>
          </label>
          <select
            name="bo_status"
            value={formData.bo_status || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select BO status</option>
            <option value="identified">Identified</option>
            <option value="not_identified">Not Identified</option>
            <option value="exempt">Exempt</option>
          </select>
        </div>

        {/* Declared Turnover Band */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Declared Turnover (FBR) <span className="text-red-500">*</span>
          </label>
          <select
            name="declared_turnover_band"
            value={formData.declared_turnover_band || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select turnover band</option>
            <option value="micro">Micro (Below $100k)</option>
            <option value="small">Small ($100k - $1M)</option>
            <option value="medium">Medium ($1M - $10M)</option>
            <option value="large">Large (Above $10M)</option>
          </select>
        </div>

        {/* Transaction Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Transaction Amount <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="transaction_amount"
            value={formData.transaction_amount || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter amount (numeric)"
            required
          />
        </div>

        {/* Source of Funds */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Source of Funds <span className="text-red-500">*</span>
          </label>
          <select
            name="source_of_funds"
            value={formData.source_of_funds || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select source of funds</option>
            <option value="revenue">Business Revenue</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan/Credit</option>
            <option value="capital_injection">Capital Injection</option>
            <option value="grants">Grants/Funding</option>
          </select>
        </div>

        {/* Hard documents submitted? */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              name="hard_docs_submitted"
              checked={formData.hard_docs_submitted || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required
            />
          </div>
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">
              Hard documents submitted? <span className="text-red-500">*</span>
            </label>
            <p className="text-gray-500">
              All required hardcopy documents have been submitted and verified.
            </p>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required
            />
          </div>
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">
              Declaration + Consent <span className="text-red-500">*</span>
            </label>
            <p className="text-gray-500">
              I declare that the information provided is true and complete to the best of my knowledge.
            </p>
          </div>
        </div>

        {/* Placeholder for remaining questions */}
        <div className="space-y-6">
          <p className="text-sm text-gray-500 italic">
            [Additional legal person questions: Province/Area Registration, Pakistan Geography, Business Sector, UBO Country Risk, Control Type, Purpose of Relationship]
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">CDD / KYC / EDD</h1>
        <p className="text-lg text-gray-600 mt-2">
          Customer due diligence and enhanced due diligence workflows.
        </p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Inspection-safe note:</span> This module guides the DNFBP through customer onboarding for Natural and Legal persons. Automated screening, risk rating, and printable CDD/KYC reports will be generated here. Final compliance decisions always remain subject to human review.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* Question 1: Nature of Customer */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Question 1: Nature of Customer</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Type <span className="text-red-500">*</span>
            </label>
            <select
              value={customerType}
              onChange={handleCustomerTypeChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select customer type</option>
              <option value="natural">Natural Person</option>
              <option value="legal">Legal Person</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              This selection determines which form you will need to complete.
            </p>
          </div>
        </div>

        {/* Conditional Forms */}
        {customerType === "natural" && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <NaturalPersonForm formData={formData} setFormData={setFormData} />
          </div>
        )}

        {customerType === "legal" && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <LegalPersonForm formData={formData} setFormData={setFormData} />
          </div>
        )}

        {/* Generate Button - Updated per Step 8.4 */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={handleGenerate}
            disabled={saving}
            className={`w-full py-3 px-4 rounded-md font-medium ${
              saving 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {saving ? "Processing…" : "Generate CDD/KYC Report"}
          </button>
          
          {/* Error display as specified */}
          {saveError ? <div style={{ color: "#b91c1c", marginTop: 10 }}>{saveError}</div> : null}
          
          <p className="mt-2 text-sm text-gray-500 text-center">
            Complete all mandatory fields to continue
          </p>
        </div>
      </main>
    </div>
  );
}
