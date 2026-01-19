// utils/pdf/legalPersonSnapshotPdf.js
import jsPDF from "jspdf";

/**
 * Inspection-safe Entity Snapshot PDF for a Legal Person.
 * Neutral language. Review-based. Printable/exportable.
 */
export function generateLegalPersonSnapshotPdf({ entity, associates, miniKycByAssoc, uboThreshold }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 48;

  const line = (text, opts = {}) => {
    const fontSize = opts.size || 11;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);

    const maxWidth = pageWidth - margin * 2;
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const l of lines) {
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = 48;
      }
      doc.text(l, margin, y);
      y += fontSize + 6;
    }
  };

  const spacer = (h = 10) => { y += h; };

  const safe = (v) => (v ?? "").toString().trim();

  // Header
  line("Entity Snapshot (Legal Person)", { bold: true, size: 16 });
  line("Inspection-ready documentation view (review-based, neutral language).", { size: 10 });
  spacer(14);

  // Entity section
  line("Entity details", { bold: true, size: 12 });
  spacer(4);
  line(`Name: ${safe(entity?.name) || "—"}`);
  line(`Status: ${safe(entity?.status) || "—"}`);
  line(`Sector: ${safe(entity?.sector) || "—"}`);
  line(`NTN: ${safe(entity?.ntn) || "—"}`);
  line(`SECP registration: ${safe(entity?.secp_registration) || "—"}`);
  line(`Address: ${safe(entity?.address) || "—"}`);
  spacer(10);

  // Complexity indicators (neutral)
  line("Complexity indicators (selected)", { bold: true, size: 12 });
  spacer(4);
  const flags = [
    { k: "Cross-border exposure", v: !!entity?.has_cross_border },
    { k: "Complex ownership structure", v: !!entity?.has_complex_ownership },
    { k: "Bearer shares", v: !!entity?.has_bearer_shares },
  ];
  flags.forEach(f => line(`${f.k}: ${f.v ? "Yes" : "No"}`));
  spacer(10);

  // Ownership & Control
  line("Ownership & control register (summary)", { bold: true, size: 12 });
  spacer(4);
  line(`UBO threshold: ≥ ${Number(uboThreshold || 25)}%`, { size: 11 });
  spacer(8);

  const owners = (associates || []).filter(a => a.role === "ubo");
  const ctrls = (associates || []).filter(a => ["controller", "director", "signatory"].includes(a.role));

  const renderPerson = (a) => {
    const mk = miniKycByAssoc?.[a.id] || {};
    const name = safe(mk.full_name) || "Name not recorded";
    const pep = mk.pep_status || "unknown";
    const sanc = mk.sanctions_screening || "not_done";

    let extra = "";
    if (a.role === "ubo") {
      const own = Number(a.ownership_percent || 0);
      const meets = own >= Number(uboThreshold || 25);
      extra = ` • Ownership: ${own}% • Indirect: ${a.is_indirect ? "Yes" : "No"} • Threshold: ${meets ? "Meets" : "Below"}`;
    }

    line(`${a.role.toUpperCase()} — ${name}${extra}`);
    line(`   PEP: ${pep} • Sanctions screening: ${sanc}`, { size: 10 });
  };

  if (owners.length === 0) {
    line("UBOs: none recorded.", { size: 10 });
  } else {
    line("UBOs:", { bold: true, size: 11 });
    owners.forEach(renderPerson);
  }
  spacer(8);

  if (ctrls.length === 0) {
    line("Controllers: none recorded.", { size: 10 });
  } else {
    line("Controllers:", { bold: true, size: 11 });
    ctrls.forEach(renderPerson);
  }

  spacer(14);
  line("Notes", { bold: true, size: 12 });
  spacer(4);
  line(
    "This document is generated for recordkeeping and inspection-readiness. " +
      "It supports review and documentation. It does not submit information to regulators or file any reports.",
    { size: 10 }
  );

  return doc;
}
