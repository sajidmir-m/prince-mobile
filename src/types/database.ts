export type UserRole = "admin" | "staff";
export type DeviceStatus = "in_stock" | "reserved" | "sold";
export type SecondHandStatus = "purchased" | "in_stock" | "sold";
export type PaymentStatus = "pending" | "partial" | "paid";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  notes: string | null;
  deleted_at: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  email: string | null;
  gst_number: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface MobileDevice {
  id: string;
  brand: string;
  model: string;
  color: string | null;
  ram: string | null;
  storage: string | null;
  imei1: string;
  imei2: string | null;
  serial_number: string | null;
  quantity?: number;
  purchase_id?: string | null;
  purchase_price: number;
  selling_price: number;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_invoice_number: string | null;
  purchase_date: string;
  warranty_info: string | null;
  purchase_bill_url: string | null;
  notes: string | null;
  status: DeviceStatus;
  qr_code_data: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface SecondHandDevice {
  id: string;
  brand: string;
  model: string;
  color: string | null;
  ram: string | null;
  storage: string | null;
  imei1: string;
  imei2: string | null;
  condition: string | null;
  accessories_included: string | null;
  battery_health: string | null;
  remarks: string | null;
  seller_name: string;
  seller_phone: string | null;
  seller_id_number: string | null;
  seller_address: string | null;
  purchase_date: string;
  purchase_price: number;
  selling_price: number | null;
  quantity?: number;
  supplier_id?: string | null;
  purchase_id?: string | null;
  status: SecondHandStatus;
  qr_code_data: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface AccessoryProduct {
  id: string;
  name: string;
  category_id: string | null;
  sku: string | null;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  supplier_id: string | null;
  stock_status: StockStatus;
  deleted_at: string | null;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  sale_date: string;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total_amount: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_type: string;
  product_id: string | null;
  description: string;
  imei: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  warranty_info: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  sale_id: string;
  customer_id: string | null;
  invoice_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string | null;
  qr_code_data: string | null;
}

export interface ImeiHistory {
  device: MobileDevice | SecondHandDevice | null;
  deviceType: "new" | "second_hand" | null;
  purchase: {
    date: string;
    supplier: string;
    cost: number;
    billUrl: string | null;
  } | null;
  sale: {
    customerName: string;
    customerPhone: string;
    invoiceNumber: string;
    saleDate: string;
    salePrice: number;
  } | null;
  documents: { type: string; url: string }[];
}

export interface DashboardStats {
  totalSales: number;
  todaySales: number;
  monthlyRevenue: number;
  inventoryValue: number;
  lowStockCount: number;
  soldMobiles: number;
  unsoldMobiles: number;
  recentTransactions: {
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
  }[];
}
