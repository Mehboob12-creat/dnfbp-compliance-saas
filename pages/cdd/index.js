import Link from "next/link";
import AppShell from "../../components/AppShell";

export default function CddHome() {
  return (
    <AppShell title="CDD / KYC / EDD">
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-900">
              CDD / KYC / EDD
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              Centralized customer due diligence workflows for Natural and Legal
              Persons. This system supports internal compliance and inspection
              readiness only. No automatic filings or regulator submissions are
              performed.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Natural Person */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Natural Person
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Add Customer
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  15-question Customer Due Diligence (CDD/KYC) wizard for
                  individual customers. Start here for personal transactions,
                  property buyers/sellers, and individual clients.
                </p>
              </div>

              <div className="mt-6">
                <Link
                  href="/customers/new"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                >
                  Start CDD (Natural Person)
                </Link>
              </div>
            </div>

            {/* Legal Person */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Legal Person
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Legal Entities
                </h2>
                <p className="mt-3 text-sm text-slate-600">
                  Entity onboarding, beneficial ownership (UBO/controllers),
                  ownership structure, and inspection-ready exports for companies,
                  trusts, partnerships, and other legal persons.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/entities/new"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                >
                  Add Legal Entity
                </Link>

                <Link
                  href="/entities"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50"
                >
                  View Entities
                </Link>
              </div>
            </div>
          </div>

          {/* Inspection Note */}
          <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Inspection note:</strong> All records created through this
              module are retained for internal compliance, audit, and regulatory
              inspection support. Risk assessment, screening results, STR/CTR
              recommendations, and final decisions remain subject to human review
              and approval.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
