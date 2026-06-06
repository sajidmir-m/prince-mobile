import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { STORE } from "@/lib/store-config";
import type { InvoiceData } from "@/types/invoice";

export type InvoicePdfData = InvoiceData;

let cachedLogoDataUrl: string | null = null;

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

export async function generateInvoicePdf(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const headerHeight = 48;

  const logoUrl = data.storeLogoUrl || STORE.logo;
  const logoData = await getLogoDataUrl(logoUrl);

  // Black branded header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  if (logoData) {
    const logoW = 36;
    const logoH = 22;
    doc.addImage(logoData, "JPEG", (pageWidth - logoW) / 2, 4, logoW, logoH);
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

  // Invoice title block
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", margin, 58);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${data.invoiceNumber}`, margin, 65);
  doc.text(`Date: ${data.invoiceDate}`, margin, 70);
  if (data.paymentMethod) {
    doc.text(`Payment: ${data.paymentMethod.replace("_", " ")}`, margin, 75);
  }

  // Bill To box
  const boxX = pageWidth - margin - 78;
  const boxY = 54;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, 78, 34, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BILL TO", boxX + 4, boxY + 7);
  doc.setFont("helvetica", "normal");

  const c = data.customer;
  let cy = boxY + 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(c.name || "Customer", boxX + 4, cy, { maxWidth: 70 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  cy += 5;
  if (c.phone) {
    doc.text(`Mobile: ${c.phone}`, boxX + 4, cy);
    cy += 4;
  }
  if (c.address) {
    doc.text(c.address, boxX + 4, cy, { maxWidth: 70 });
    cy += 4;
  }
  if (c.email) {
    doc.text(c.email, boxX + 4, cy);
    cy += 4;
  }
  if (c.gst_number) {
    doc.text(`GST: ${c.gst_number}`, boxX + 4, cy);
  }

  autoTable(doc, {
    startY: 92,
    margin: { left: margin, right: margin },
    head: [["#", "Description", "IMEI", "Qty", "Unit Price", "Amount"]],
    body: data.items.map((item, i) => [
      String(i + 1),
      item.description + (item.warranty ? `\nWarranty: ${item.warranty}` : ""),
      item.imei || "—",
      String(item.qty),
      fmt(item.unitPrice),
      fmt(item.total),
    ]),
    theme: "striped",
    headStyles: { fillColor: [0, 0, 0], fontSize: 8, textColor: 255 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 58 },
      2: { cellWidth: 32, fontStyle: "normal" },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  const totalsX = pageWidth - margin - 55;

  doc.setFontSize(9);
  doc.text("Subtotal:", totalsX, finalY + 12);
  doc.text(fmt(data.subtotal), pageWidth - margin, finalY + 12, { align: "right" });

  let offset = 18;
  if (data.taxAmount > 0) {
    doc.text(`Tax${data.taxRate ? ` (${data.taxRate}%)` : ""}:`, totalsX, finalY + offset);
    doc.text(fmt(data.taxAmount), pageWidth - margin, finalY + offset, { align: "right" });
    offset += 6;
  }

  if (data.discount > 0) {
    doc.text("Discount:", totalsX, finalY + offset);
    doc.text(`- ${fmt(data.discount)}`, pageWidth - margin, finalY + offset, { align: "right" });
    offset += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("GRAND TOTAL:", totalsX, finalY + offset + 6);
  doc.text(fmt(data.total), pageWidth - margin, finalY + offset + 6, { align: "right" });
  doc.setFont("helvetica", "normal");

  if (data.notes) {
    doc.setFontSize(8);
    doc.text("Notes:", margin, finalY + 14);
    doc.text(data.notes, margin, finalY + 20, { maxWidth: 90 });
  }

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Thank you for shopping at " + data.storeName, pageWidth / 2, 285, { align: "center" });
  doc.text("Goods sold are not returnable unless stated in warranty.", pageWidth / 2, 289, {
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
