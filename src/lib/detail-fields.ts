import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { DetailField } from "@/components/crud/detail-view";
import type { MobileDevice, SecondHandDevice, Customer, Supplier, AccessoryProduct } from "@/types/database";

export function mobileDetailSections(device: MobileDevice) {
  return [
    {
      title: "Device",
      fields: [
        { label: "Brand", value: device.brand },
        { label: "Model", value: device.model },
        { label: "Color", value: device.color },
        { label: "RAM", value: device.ram },
        { label: "Storage", value: device.storage },
        { label: "Quantity", value: device.quantity ?? 1 },
        { label: "Status", value: device.status?.replace("_", " ") },
        { label: "Serial Number", value: device.serial_number, mono: true },
      ],
    },
    {
      title: "IMEI",
      fields: [
        { label: "IMEI 1", value: device.imei1, mono: true, href: `/dashboard/imei?q=${device.imei1}` },
        { label: "IMEI 2", value: device.imei2, mono: true },
      ],
    },
    {
      title: "Pricing",
      fields: [
        { label: "Purchase Price", value: formatCurrency(Number(device.purchase_price)) },
        { label: "Selling Price", value: formatCurrency(Number(device.selling_price)) },
        { label: "Purchase Date", value: formatDate(device.purchase_date) },
        { label: "Warranty", value: device.warranty_info, fullWidth: true },
      ],
    },
    {
      title: "Supplier & Purchase",
      fields: [
        { label: "Supplier", value: device.supplier_name },
        { label: "Supplier Invoice #", value: device.supplier_invoice_number },
        { label: "Purchase Bill", value: device.purchase_bill_url ? "View document" : null, href: device.purchase_bill_url || undefined },
        { label: "Synced Purchase ID", value: device.purchase_id, mono: true },
      ],
    },
    {
      title: "Other",
      fields: [
        { label: "Notes", value: device.notes, fullWidth: true },
        { label: "Added On", value: formatDateTime(device.created_at) },
      ],
    },
  ];
}

export function secondHandDetailSections(
  device: SecondHandDevice,
  documents?: { document_type: string; file_url: string }[]
) {
  const docFields: DetailField[] =
    documents?.map((d) => ({
      label: d.document_type,
      value: "View file",
      href: d.file_url,
    })) ?? [];

  return [
    {
      title: "Device",
      fields: [
        { label: "Brand", value: device.brand },
        { label: "Model", value: device.model },
        { label: "Color", value: device.color },
        { label: "RAM / Storage", value: `${device.ram || "—"} / ${device.storage || "—"}` },
        { label: "Quantity", value: device.quantity ?? 1 },
        { label: "Condition", value: device.condition },
        { label: "Battery Health", value: device.battery_health },
        { label: "Status", value: device.status?.replace("_", " ") },
        { label: "IMEI 1", value: device.imei1, mono: true, href: `/dashboard/imei?q=${device.imei1}` },
        { label: "IMEI 2", value: device.imei2, mono: true },
        { label: "Accessories Included", value: device.accessories_included, fullWidth: true },
        { label: "Remarks", value: device.remarks, fullWidth: true },
      ],
    },
    {
      title: "Seller",
      fields: [
        { label: "Seller Name", value: device.seller_name },
        { label: "Phone", value: device.seller_phone },
        { label: "ID Number", value: device.seller_id_number, mono: true },
        { label: "Address", value: device.seller_address, fullWidth: true },
        { label: "Purchase Date", value: formatDate(device.purchase_date) },
        { label: "Purchase Price", value: formatCurrency(Number(device.purchase_price)) },
        { label: "Selling Price", value: device.selling_price ? formatCurrency(Number(device.selling_price)) : null },
        { label: "Purchase ID", value: device.purchase_id, mono: true },
      ],
    },
    ...(docFields.length
      ? [{ title: "Documents", fields: docFields }]
      : []),
  ];
}

export function customerDetailFields(c: Customer, totalPurchases?: number): DetailField[] {
  return [
    { label: "Name", value: c.name },
    { label: "Phone", value: c.phone },
    { label: "Email", value: c.email },
    { label: "GST Number", value: c.gst_number },
    { label: "Address", value: c.address, fullWidth: true },
    { label: "Total Purchases", value: totalPurchases !== undefined ? formatCurrency(totalPurchases) : undefined },
    { label: "Customer Since", value: formatDate(c.created_at) },
  ];
}

export function supplierDetailFields(s: Supplier): DetailField[] {
  return [
    { label: "Name", value: s.name },
    { label: "Phone", value: s.phone },
    { label: "Email", value: s.email },
    { label: "GST Number", value: s.gst_number },
    { label: "Address", value: s.address, fullWidth: true },
    { label: "Notes", value: s.notes, fullWidth: true },
  ];
}

export function purchaseDetailSections(p: {
  purchase_number: string;
  seller_name?: string | null;
  suppliers?: { name: string } | null;
  purchase_date: string;
  total_amount: number;
  payment_status: string;
  bill_url?: string | null;
  notes?: string | null;
  purchase_items?: {
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_type: string;
    imei?: string | null;
  }[];
}) {
  const items = p.purchase_items?.map((item, i) => ({
    label: `Item ${i + 1}`,
    value: `${item.description} · Qty ${item.quantity} · ${formatCurrency(item.total_price)}`,
    fullWidth: true,
  })) ?? [];

  return [
    {
      title: "Purchase",
      fields: [
        { label: "Purchase #", value: p.purchase_number, mono: true },
        { label: "Supplier / Seller", value: p.suppliers?.name || p.seller_name },
        { label: "Date", value: formatDate(p.purchase_date) },
        { label: "Total Amount", value: formatCurrency(Number(p.total_amount)) },
        { label: "Payment Status", value: p.payment_status },
        { label: "Bill", value: p.bill_url ? "View bill" : null, href: p.bill_url || undefined },
        { label: "Notes", value: p.notes, fullWidth: true },
      ],
    },
    ...(items.length ? [{ title: "Line Items", fields: items }] : []),
  ];
}

export function saleDetailSections(sale: {
  sale_number: string;
  sale_date: string;
  payment_method?: string | null;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total_amount: number;
  notes?: string | null;
  customers?: { name: string; phone: string; email?: string; address?: string } | null;
  sale_items?: {
    description: string;
    imei?: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    warranty_info?: string | null;
  }[];
}) {
  const itemFields: DetailField[] =
    sale.sale_items?.map((item, i) => ({
      label: `Item ${i + 1}`,
      value: `${item.description}${item.imei ? ` · IMEI ${item.imei}` : ""} · ${item.quantity}×${formatCurrency(item.unit_price)} = ${formatCurrency(item.total_price)}${item.warranty_info ? ` · Warranty: ${item.warranty_info}` : ""}`,
      fullWidth: true,
      href: item.imei ? `/dashboard/imei?q=${item.imei}` : undefined,
    })) ?? [];

  return [
    {
      title: "Sale",
      fields: [
        { label: "Sale #", value: sale.sale_number, mono: true },
        { label: "Date", value: formatDateTime(sale.sale_date) },
        { label: "Payment", value: sale.payment_method },
        { label: "Subtotal", value: formatCurrency(Number(sale.subtotal)) },
        { label: "Tax", value: formatCurrency(Number(sale.tax_amount)) },
        { label: "Discount", value: formatCurrency(Number(sale.discount)) },
        { label: "Total", value: formatCurrency(Number(sale.total_amount)) },
        { label: "Notes", value: sale.notes, fullWidth: true },
      ],
    },
    {
      title: "Customer",
      fields: [
        { label: "Name", value: sale.customers?.name || "Walk-in" },
        { label: "Phone", value: sale.customers?.phone },
        { label: "Email", value: sale.customers?.email },
        { label: "Address", value: sale.customers?.address, fullWidth: true },
      ],
    },
    ...(itemFields.length ? [{ title: "Products Sold", fields: itemFields }] : []),
  ];
}

export function accessoryDetailFields(p: AccessoryProduct): DetailField[] {
  return [
    { label: "Product Name", value: p.name },
    { label: "SKU", value: p.sku, mono: true },
    { label: "Quantity", value: p.quantity },
    { label: "Stock Status", value: p.stock_status?.replace("_", " ") },
    { label: "Purchase Price", value: formatCurrency(Number(p.purchase_price)) },
    { label: "Selling Price", value: formatCurrency(Number(p.selling_price)) },
    { label: "Low Stock Alert", value: p.low_stock_threshold },
  ];
}
