import jsPDF from "jspdf";

/**
 * Generates Risk Assessment PDF
 * INSPECTION-SAFE
 * - No compliance claims
 * - Explainable logic only
 * - Human review assumed
 */
export function generateRiskAssessmentPdf({
  customer,
  risk,
  redFlags = [],
  generatedBy = "Compliance Officer",
}) {
  const doc = new jsPDF();

  let y = 15;

  const line = (text, inc = 8) => {
    doc.text(text, 14, y);
    y += inc;
  };

  // Header
  doc.setFontSize(16);
  line("Risk Assessment Report", 10);

  doc.setFontSize(10);
  line("For internal compliance review and inspection preparation.");
  line("This document does not constitute regulatory reporting.");
  y += 6;

  // Customer Info
  doc.setFontSize(12);
  line("Customer Information", 8);
  doc.setFontSize(10);
  line(`Name: ${customer?.full_name || customer?.name || "—"}`);
  line(`CNIC: ${customer?.cnic || "—"}`);
  line(`City/District: ${customer?.city || customer?.district || "—"}`);
  y += 4;

  // Risk Summary
  doc.setFontSize(12);
  line("Risk Summary", 8);
  doc.setFontSize(10);
  line(`Risk Score: ${risk?.score ?? "—"}`);
  line(`Risk Band: ${risk?.risk_band || "UNKNOWN"}`);
  y += 4;

  // Explainability
  doc.setFontSize(12);
  line("Risk Factors & Explainability", 8);
  doc.setFontSize(10);

  if (Array.isArray(risk?.factors)) {
    risk.factors.forEach((f) => {
      line(`• ${f.label}: ${f.value}`);
    });
  } else {
    line("Risk factors recorded in system.");
  }

  y += 4;

  // Red Flags
  doc.setFontSize(12);
  line("Observed Red Flags (if any)", 8);
  doc.setFontSize(10);

  if (redFlags.length === 0) {
    line("No red flags recorded.");
  } else {
    redFlags.forEach((rf) => line(`• ${rf}`));
  }

  y += 6;

  // Footer
  doc.setFontSize(9);
  line(`Generated on: ${new Date().toLocaleString()}`);
  line(`Reviewed by: ${generatedBy}`);
  line("Human review required for all regulatory decisions.");

  return doc;
}
