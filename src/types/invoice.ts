export interface InvoiceCustomerInfo {
  name: string;
  phone: string;
  address?: string;
  email?: string;
  gst_number?: string;
}

export interface InvoiceItemDetails {
  productType: "mobile" | "second_hand" | "accessory";
  brand?: string;
  model?: string;
  color?: string | null;
  ram?: string | null;
  storage?: string | null;
  imei1?: string | null;
  imei2?: string | null;
  serialNumber?: string | null;
  sku?: string | null;
  category?: string | null;
  condition?: string | null;
  batteryHealth?: string | null;
  accessoriesIncluded?: string | null;
  warranty?: string | null;
}

export interface InvoiceLineItem {
  description: string;
  details: InvoiceItemDetails;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceBankDetails {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  branch?: string;
  iban?: string;
}

export interface InvoiceData {
  storeName: string;
  storeLogoUrl?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  storeGst?: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: InvoiceCustomerInfo;
  items: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  taxRate?: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
  bankDetails?: InvoiceBankDetails;
  qrData?: string;
}
