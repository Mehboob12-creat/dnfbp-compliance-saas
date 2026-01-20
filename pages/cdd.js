import { useState } from "react";

export default function CddPage() {
  // Step 7.3 — State
  const [customerType, setCustomerType] = useState(""); // "natural" | "legal"
  const [formData, setFormData] = useState({});

  // Handle customer type change
  const handleCustomerTypeChange = (e) => {
    const newType = e.target.value;
    setCustomerType(newType);
    // Reset formData when customer type changes
    setFormData({});
  };

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
        
        {/* Question 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Declared Income Band <span className="text-red-500">*</span>
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

        {/* Question 2 */}
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

        {/* Question 3 */}
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

        {/* Placeholder for remaining 12 questions */}
        <div className="space-y-6">
          <p className="text-sm text-gray-500 italic">
            [12 additional questions for natural person would be implemented here with similar structure]
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
        
        {/* Question 1 */}
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
            <option value="sole_proprietorship">Sole Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private Limited</option>
            <option value="public_limited">Public Limited</option>
            <option value="non_profit">Non-Profit Organization</option>
          </select>
        </div>

        {/* Question 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Jurisdiction of Incorporation <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="jurisdiction"
            value={formData.jurisdiction || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter jurisdiction"
            required
          />
        </div>

        {/* Question 3 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Annual Revenue Band <span className="text-red-500">*</span>
          </label>
          <select
            name="revenue_band"
            value={formData.revenue_band || ""}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select revenue band</option>
            <option value="micro">Micro (Below $100k)</option>
            <option value="small">Small ($100k - $1M)</option>
            <option value="medium">Medium ($1M - $10M)</option>
            <option value="large">Large (Above $10M)</option>
          </select>
        </div>

        {/* Placeholder for remaining 12 questions */}
        <div className="space-y-6">
          <p className="text-sm text-gray-500 italic">
            [12 additional questions for legal person would be implemented here with similar structure]
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

        {/* Generate Button */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            disabled
            className="w-full py-3 px-4 bg-gray-300 text-gray-500 rounded-md font-medium cursor-not-allowed"
            title="Complete all mandatory fields to continue"
          >
            Generate CDD/KYC Report
          </button>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Complete all mandatory fields to continue
          </p>
        </div>
      </main>
    </div>
  );
}
