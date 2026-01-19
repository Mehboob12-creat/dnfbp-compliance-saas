import { jsPDF } from "jspdf";

function safeText(x) {
  return typeof x === "string" ? x : "";
}

export function generateNoticeResponsePdf({ notice = {}, response = {} }) {
  const doc = new jsPDF();
  const marginX = 14;
  let y = 16;

  const title = "Response Draft (Human-Reviewed)";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, marginX, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Inspection-safe note: This document is an export for internal review and client submission preparation.", marginX, y);
  y += 6;
  doc.text("This platform does not submit responses to regulators. Submission remains human-controlled.", marginX, y);
  y += 10;

  const meta = [
    ["Regulator / Authority", safeText(notice.regulator_name) || "—"],
    ["Reference no.", safeText(notice.reference_no) || "—"],
    ["Notice date", notice.notice_date ? String(notice.notice_date) : "—"],
    ["Response deadline", notice.response_deadline ? String(notice.response_deadline) : "—"],
    ["Status (platform)", safeText(notice.status) || "—"],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Notice details", marginX, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const [k, v] of meta) {
    doc.text(`${k}: ${v}`, marginX, y);
    y += 5;
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Response text", marginX, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const body = safeText(response.response_text) || "—";
  const lines = doc.splitTextToSize(body, 180);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
    doc.text(line, marginX, y);
    y += 5;
  }

  y += 6;
  if (y > 270) {
    doc.addPage();
    y = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Consultant notes (optional)", marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const notes = safeText(response.consultant_notes) || "—";
  const noteLines = doc.splitTextToSize(notes, 180);
  for (const line of noteLines) {
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
    doc.text(line, marginX, y);
    y += 5;
  }

  return doc;
}
