import { createClient } from "@/lib/supabase/client";
import { generateNumber } from "@/lib/format";

export interface SyncPurchaseInput {
  supplierId?: string | null;
  supplierOrSellerName: string;
  purchaseDate: string;
  description: string;
  quantity: number;
  unitPrice: number;
  productType: "mobile" | "second_hand";
  productId: string;
  billUrl?: string | null;
  invoiceNumber?: string | null;
}

export async function syncPurchaseRecord(input: SyncPurchaseInput) {
  const supabase = createClient();
  const total = input.unitPrice * input.quantity;
  const purchaseNumber = generateNumber("PUR");

  const { data: purchase, error } = await supabase
    .from("purchases")
    .insert({
      purchase_number: purchaseNumber,
      supplier_id: input.supplierId || null,
      seller_name: input.supplierOrSellerName,
      purchase_date: input.purchaseDate,
      total_amount: total,
      payment_status: "paid",
      bill_url: input.billUrl || null,
      notes: `Auto-synced from ${input.productType} inventory`,
    })
    .select()
    .single();

  if (error || !purchase) {
    throw new Error(error?.message || "Failed to create purchase record");
  }

  await supabase.from("purchase_items").insert({
    purchase_id: purchase.id,
    product_type: input.productType,
    product_id: input.productId,
    description: input.description,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    total_price: total,
  });

  return purchase;
}

export async function softDeleteRecord(
  table: string,
  id: string,
  entityType: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { logAudit } = await import("@/lib/audit");
  await logAudit("SOFT_DELETE", entityType, id, null, { deleted_at: new Date().toISOString() });
}
