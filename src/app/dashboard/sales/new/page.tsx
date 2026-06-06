import { createClient } from "@/lib/supabase/server";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { STORE } from "@/lib/store-config";

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
        storePhone={settings?.store_phone || STORE.phone}
        storeEmail={settings?.store_email || STORE.email}
        storeAddress={settings?.store_address || ""}
        storeGst={settings?.gst_number || ""}
      />
    </div>
  );
}
