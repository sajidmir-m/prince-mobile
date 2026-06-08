import { createClient } from "@/lib/supabase/server";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { STORE } from "@/lib/store-config";
import type { InvoiceBankDetails } from "@/types/invoice";

function buildBankDetails(settings: {
  bank_name?: string | null;
  bank_account_title?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
  bank_iban?: string | null;
} | null): InvoiceBankDetails | undefined {
  if (!settings) return undefined;
  const bank: InvoiceBankDetails = {
    bankName: settings.bank_name || undefined,
    accountTitle: settings.bank_account_title || undefined,
    accountNumber: settings.bank_account_number || undefined,
    branch: settings.bank_branch || undefined,
    iban: settings.bank_iban || undefined,
  };
  const hasAny = Object.values(bank).some((v) => v?.trim());
  return hasAny ? bank : undefined;
}

export default async function NewSalePage() {
  const supabase = await createClient();

  const [{ data: customers }, { data: settings }] = await Promise.all([
    supabase.from("customers").select("*").is("deleted_at", null).order("name"),
    supabase.from("store_settings").select("*").limit(1).single(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Create Invoice</h1>
        <p className="text-muted-foreground">
          Add products, enter customer details, preview & download professional invoice
        </p>
      </div>
      <NewSaleForm
        customers={customers || []}
        taxRate={Number(settings?.tax_rate) || 0}
        storeName={settings?.store_name || STORE.name}
        storeLogoUrl={settings?.logo_url || STORE.logo}
        storePhone={settings?.store_phone || STORE.phone}
        storeEmail={settings?.store_email || STORE.email}
        storeAddress={settings?.store_address || STORE.address}
        storeGst={settings?.gst_number || ""}
        bankDetails={buildBankDetails(settings)}
      />
    </div>
  );
}
