import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InvoiceData } from "@/types/invoice";

export type InvoicePdfData = InvoiceData;

function fmt(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const brandBlue: [number, number, number] = [30, 64, 175];

  // Header bar
  doc.setFillColor(...brandBlue);
  doc.rect(0, 0, pageWidth, 42, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.storeName, pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let hy = 22;
  if (data.storeAddress) {
    doc.text(data.storeAddress, pageWidth / 2, hy, { align: "center", maxWidth: pageWidth - 28 });
    hy += 5;
  }
  const contact = [data.storePhone && `Tel: ${data.storePhone}`, data.storeEmail, data.storeGst && `GST: ${data.storeGst}`]
    .filter(Boolean)
    .join("  |  ");
  if (contact) doc.text(contact, pageWidth / 2, hy, { align: "center" });

  doc.setTextColor(0, 0, 0);

  // Invoice title block
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", margin, 52);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${data.invoiceNumber}`, margin, 60);
  doc.text(`Date: ${data.invoiceDate}`, margin, 66);
  if (data.paymentMethod) {
    doc.text(`Payment: ${data.paymentMethod.replace("_", " ")}`, margin, 72);
  }

  // Bill To box
  const boxX = pageWidth - margin - 78;
  const boxY = 48;
  doc.setDrawColor(...brandBlue);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, boxY, 78, 32, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO", boxX + 4, boxY + 7);
  doc.setFont("helvetica", "normal");

  const c = data.customer;
  let cy = boxY + 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(c.name || "Customer", boxX + 4, cy, { maxWidth: 70 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  cy += 6;
  if (c.phone) {
    doc.text(`Mobile: ${c.phone}`, boxX + 4, cy);
    cy += 5;
  }
  if (c.address) {
    doc.text(c.address, boxX + 4, cy, { maxWidth: 70 });
    cy += 5;
  }
  if (c.email) {
    doc.text(c.email, boxX + 4, cy);
    cy += 5;
  }
  if (c.gst_number) {
    doc.text(`GST: ${c.gst_number}`, boxX + 4, cy);
  }

  autoTable(doc, {
    startY: 88,
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
    headStyles: { fillColor: brandBlue, fontSize: 9 },
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

  doc.setFontSize(10);
  doc.text("Subtotal:", totalsX, finalY + 12);
  doc.text(fmt(data.subtotal), pageWidth - margin, finalY + 12, { align: "right" });

  if (data.taxAmount > 0) {
    doc.text(`Tax${data.taxRate ? ` (${data.taxRate}%)` : ""}:`, totalsX, finalY + 18);
    doc.text(fmt(data.taxAmount), pageWidth - margin, finalY + 18, { align: "right" });
  }

  if (data.discount > 0) {
    doc.text("Discount:", totalsX, finalY + 24);
    doc.text(`- ${fmt(data.discount)}`, pageWidth - margin, finalY + 24, { align: "right" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("GRAND TOTAL:", totalsX, finalY + 34);
  doc.text(fmt(data.total), pageWidth - margin, finalY + 34, { align: "right" });
  doc.setFont("helvetica", "normal");

  if (data.notes) {
    doc.setFontSize(9);
    doc.text("Notes:", margin, finalY + 20);
    doc.text(data.notes, margin, finalY + 26, { maxWidth: 90 });
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Thank you for shopping at " + data.storeName, pageWidth / 2, 285, { align: "center" });
  doc.text("Goods sold are not returnable unless stated in warranty.", pageWidth / 2, 290, { align: "center" });

  return doc;
}

export function downloadInvoicePdf(data: InvoiceData, filename?: string) {
  const doc = generateInvoicePdf(data);
  doc.save(filename ?? `invoice-${data.invoiceNumber}.pdf`);
}

export function printInvoicePdf(data: InvoiceData) {
  const doc = generateInvoicePdf(data);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
