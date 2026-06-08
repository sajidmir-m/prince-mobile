import type { InvoiceBankDetails, InvoiceCustomerInfo, InvoiceItemDetails } from "@/types/invoice";

export type DetailLine = { label: string; value: string };

function push(lines: DetailLine[], label: string, value?: string | null) {
  if (value?.trim()) lines.push({ label, value: value.trim() });
}

export function getInvoiceMetaLines(
  invoiceNumber: string,
  invoiceDate: string,
  paymentMethod?: string
): DetailLine[] {
  const lines: DetailLine[] = [];
  push(lines, "Invoice No.", invoiceNumber || "—");
  push(lines, "Date", invoiceDate);
  if (paymentMethod) {
    push(lines, "Payment", paymentMethod.replace("_", " "));
  }
  return lines;
}

export function getCustomerDetailLines(customer: InvoiceCustomerInfo): DetailLine[] {
  const lines: DetailLine[] = [];
  push(lines, "Customer Name", customer.name || "—");
  push(lines, "Mobile No.", customer.phone);
  push(lines, "Address", customer.address);
  push(lines, "Email", customer.email);
  push(lines, "GST No.", customer.gst_number);
  return lines;
}

export function getInvoiceItemDetailLines(details: InvoiceItemDetails): DetailLine[] {
  const lines: DetailLine[] = [];

  if (details.productType === "mobile" || details.productType === "second_hand") {
    push(lines, "Brand", details.brand);
    push(lines, "Model", details.model);
    push(lines, "Color", details.color);
    push(lines, "RAM", details.ram);
    push(lines, "ROM", details.storage);
    push(lines, "IMEI No. 1", details.imei1);
    push(lines, "IMEI No. 2", details.imei2);
    push(lines, "Serial No.", details.serialNumber);
    if (details.productType === "second_hand") {
      push(lines, "Condition", details.condition);
      push(lines, "Battery Health", details.batteryHealth);
      push(lines, "Accessories Included", details.accessoriesIncluded);
    }
    push(lines, "Warranty", details.warranty);
  }

  if (details.productType === "accessory") {
    push(lines, "SKU", details.sku);
    push(lines, "Category", details.category);
  }

  return lines;
}

export function formatDetailLinesText(lines: DetailLine[]): string {
  if (lines.length === 0) return "";
  return lines.map((l) => `${l.label}: ${l.value}`).join("\n");
}

/** Step format for PDF — label on one line, value on the next */
export function formatDetailLinesStepText(lines: DetailLine[]): string {
  if (lines.length === 0) return "";
  return lines.map((l) => `${l.label}\n${l.value}`).join("\n");
}

export function formatInvoiceItemDetailsText(details: InvoiceItemDetails): string {
  return formatDetailLinesStepText(getInvoiceItemDetailLines(details));
}

export function hasBankDetails(bank?: InvoiceBankDetails): boolean {
  if (!bank) return false;
  return Boolean(
    bank.bankName?.trim() ||
      bank.accountTitle?.trim() ||
      bank.accountNumber?.trim() ||
      bank.branch?.trim() ||
      bank.iban?.trim()
  );
}

export function getBankDetailLines(bank: InvoiceBankDetails): DetailLine[] {
  const lines: DetailLine[] = [];
  push(lines, "Bank Name", bank.bankName);
  push(lines, "Account Title", bank.accountTitle);
  push(lines, "Account Number", bank.accountNumber);
  push(lines, "Branch", bank.branch);
  push(lines, "IBAN", bank.iban);
  return lines;
}
