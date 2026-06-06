export interface InvoiceCustomerInfo {
  name: string;
  phone: string;
  address?: string;
  email?: string;
  gst_number?: string;
}

export interface InvoiceLineItem {
  description: string;
  imei?: string | null;
  qty: number;
  unitPrice: number;
  total: number;
  warranty?: string | null;
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
  qrData?: string;
}
