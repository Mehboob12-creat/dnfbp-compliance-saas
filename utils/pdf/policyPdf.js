import { jsPDF } from "jspdf";

function safeText(x) {
  return typeof x === "string" ? x : "";
}

// Very simple markdown-to-text for v1 (inspection-safe, readable)
function markdownToPlain(md) {
  const s = safeText(md);
  return s
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\r/g, "");
}

export function generatePolicyPdf({ title = "AML/CFT Policy", markdown = "" }) {
  const doc = new jsPDF();
  const marginX = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, marginX, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Inspection-safe note: This is an export for internal recordkeeping and inspection preparation.", marginX, y);
  y += 8;

  const body = markdownToPlain(markdown);
  const lines = doc.splitTextToSize(body, 180);

  doc.setFontSize(10);
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
    doc.text(line, marginX, y);
    y += 5;
  }

  return doc;
}
