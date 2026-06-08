import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatInvoiceItemDetailsText,
  getBankDetailLines,
  getCustomerDetailLines,
  getInvoiceMetaLines,
  hasBankDetails,
  type DetailLine,
} from "@/lib/invoice-item-details";
import { STORE } from "@/lib/store-config";
import type { InvoiceData } from "@/types/invoice";

export type InvoicePdfData = InvoiceData;

let cachedLogoDataUrl: string | null = null;

const GOLD: [number, number, number] = [218, 165, 32];
const LIGHT_BG: [number, number, number] = [250, 250, 250];
const MUTED: [number, number, number] = [100, 100, 100];

const BOLD_LABELS = new Set(["Customer Name", "Invoice No.", "Account Number"]);

async function getLogoDataUrl(url: string): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    cachedLogoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedLogoDataUrl;
  } catch {
    return null;
  }
}

function fmt(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

function formatItemDescription(item: InvoiceData["items"][number]): string {
  const detailText = formatInvoiceItemDetailsText(item.details);
  if (!detailText) return item.description;
  return `${item.description}\n${detailText}`;
}

function measureStepBlockHeight(
  doc: jsPDF,
  width: number,
  lines: DetailLine[]
): number {
  const innerW = width - 8;
  let h = 12; // title area

  for (const line of lines) {
    h += 4; // label
    doc.setFontSize(9);
    const valueLines = doc.splitTextToSize(line.value, innerW);
    h += valueLines.length * 4.2;
    h += 3; // separator gap
  }

  return h + 4; // bottom padding
}

function drawStepBlock(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  lines: DetailLine[]
): number {
  const blockHeight = measureStepBlockHeight(doc, width, lines);
  const innerW = width - 8;

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, width, blockHeight, 2, 2, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), x + 4, y + 7);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(x + width - 28, y + 5, x + width - 4, y + 5);

  let cy = y + 14;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(line.label, x + 4, cy);
    cy += 4;

    doc.setFont("helvetica", BOLD_LABELS.has(line.label) ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const valueLines = doc.splitTextToSize(line.value, innerW);
    doc.text(valueLines, x + 4, cy);
    cy += valueLines.length * 4.2;

    if (i < lines.length - 1) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.15);
      doc.line(x + 4, cy, x + width - 4, cy);
      cy += 3;
    }
  }

  return blockHeight;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const headerHeight = 48;
  const colGap = 6;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;

  const logoUrl = data.storeLogoUrl || STORE.logo;
  const logoData = await getLogoDataUrl(logoUrl);

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  if (logoData) {
    doc.addImage(logoData, "JPEG", (pageWidth - 36) / 2, 4, 36, 22);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.storeName, pageWidth / 2, logoData ? 30 : 14, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  let hy = logoData ? 35 : 22;
  const address = data.storeAddress || STORE.address;
  if (address) {
    doc.text(address, pageWidth / 2, hy, { align: "center", maxWidth: pageWidth - 28 });
    hy += 4;
  }
  const contact = [
    data.storePhone && `Tel: ${data.storePhone}`,
    data.storeEmail,
    data.storeGst && `GST: ${data.storeGst}`,
  ]
    .filter(Boolean)
    .join("  |  ");
  if (contact) doc.text(contact, pageWidth / 2, hy, { align: "center" });

  doc.setTextColor(0, 0, 0);

  const metaLines = getInvoiceMetaLines(
    data.invoiceNumber,
    data.invoiceDate,
    data.paymentMethod
  );
  const customerLines = getCustomerDetailLines(data.customer);
  const infoY = 54;

  const leftH = drawStepBlock(doc, margin, infoY, colWidth, "Tax Invoice", metaLines);
  const rightH = drawStepBlock(
    doc,
    margin + colWidth + colGap,
    infoY,
    colWidth,
    "Bill To",
    customerLines
  );
  const tableStartY = infoY + Math.max(leftH, rightH) + 10;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [["#", "Description", "Qty", "Unit Price", "Amount"]],
    body: data.items.map((item, i) => [
      String(i + 1),
      formatItemDescription(item),
      String(item.qty),
      fmt(item.unitPrice),
      fmt(item.total),
    ]),
    theme: "grid",
    headStyles: { fillColor: [0, 0, 0], fontSize: 8.5, textColor: 255 },
    bodyStyles: { fontSize: 8, cellPadding: 4, valign: "top", lineColor: [220, 220, 220] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 88 },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 32, halign: "right" },
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  const totalsX = pageWidth - margin - 55;
  let y = finalY + 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, y);
  doc.text(fmt(data.subtotal), pageWidth - margin, y, { align: "right" });
  y += 6;

  if (data.taxAmount > 0) {
    doc.text(`Tax${data.taxRate ? ` (${data.taxRate}%)` : ""}:`, totalsX, y);
    doc.text(fmt(data.taxAmount), pageWidth - margin, y, { align: "right" });
    y += 6;
  }

  if (data.discount > 0) {
    doc.text("Discount:", totalsX, y);
    doc.text(`- ${fmt(data.discount)}`, pageWidth - margin, y, { align: "right" });
    y += 6;
  }

  y += 4;

  if (data.notes) {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Notes:", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 6;
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("GRAND TOTAL:", totalsX - 10, y);
  doc.text(fmt(data.total), pageWidth - margin, y, { align: "right" });
  y += 14;

  if (hasBankDetails(data.bankDetails) && data.bankDetails) {
    const bankLines = getBankDetailLines(data.bankDetails);
    if (bankLines.length > 0) {
      const bankH = measureStepBlockHeight(doc, pageWidth - margin * 2, bankLines);
      if (y + bankH > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }

      const bankBlockH = drawStepBlock(
        doc,
        margin,
        y,
        pageWidth - margin * 2,
        "Bank Details",
        bankLines
      );
      y += bankBlockH + 8;
    }
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const footerY = Math.min(Math.max(y + 6, pageHeight - 18), pageHeight - 10);
  doc.text("Thank you for shopping at " + data.storeName, pageWidth / 2, footerY, {
    align: "center",
  });
  doc.text("Goods sold are not returnable unless stated in warranty.", pageWidth / 2, footerY + 4, {
    align: "center",
  });

  return doc;
}

export async function downloadInvoicePdf(data: InvoiceData, filename?: string) {
  const doc = await generateInvoicePdf(data);
  doc.save(filename ?? `invoice-${data.invoiceNumber}.pdf`);
}

export async function printInvoicePdf(data: InvoiceData) {
  const doc = await generateInvoicePdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
