import { createClient } from "@/lib/supabase/client";

export interface SearchResultItem {
  id: string;
  product_type: "mobile" | "second_hand" | "accessory";
  title: string;
  subtitle: string;
  imei: string | null;
  quantity: number;
  unit_price: number;
  purchase_unit_cost: number;
  warranty_info: string | null;
  max_qty: number;
}

export async function searchProducts(query: string): Promise<SearchResultItem[]> {
  const supabase = createClient();
  const q = query.trim();
  if (!q) return [];

  const results: SearchResultItem[] = [];

  const { data: mobiles } = await supabase
    .from("mobile_devices")
    .select("*")
    .or(`imei1.ilike.%${q}%,imei2.ilike.%${q}%,model.ilike.%${q}%,brand.ilike.%${q}%`)
    .in("status", ["in_stock", "reserved"])
    .is("deleted_at", null)
    .limit(15);

  mobiles?.forEach((m) => {
    const qty = m.quantity ?? 1;
    results.push({
      id: m.id,
      product_type: "mobile",
      title: `${m.brand} ${m.model}`,
      subtitle: `${m.ram || ""} ${m.storage || ""} · IMEI: ${m.imei1}`.trim(),
      imei: m.imei1,
      quantity: 1,
      unit_price: Number(m.selling_price),
      purchase_unit_cost: Number(m.purchase_price),
      warranty_info: m.warranty_info,
      max_qty: qty,
    });
  });

  const { data: shDevices } = await supabase
    .from("second_hand_devices")
    .select("*")
    .or(`imei1.ilike.%${q}%,model.ilike.%${q}%,brand.ilike.%${q}%,seller_name.ilike.%${q}%`)
    .eq("status", "in_stock")
    .is("deleted_at", null)
    .limit(15);

  shDevices?.forEach((d) => {
    const qty = d.quantity ?? 1;
    results.push({
      id: d.id,
      product_type: "second_hand",
      title: `${d.brand} ${d.model} (Used)`,
      subtitle: `Seller: ${d.seller_name} · IMEI: ${d.imei1}`,
      imei: d.imei1,
      quantity: 1,
      unit_price: Number(d.selling_price || d.purchase_price) * 1.15,
      purchase_unit_cost: Number(d.purchase_price),
      warranty_info: null,
      max_qty: qty,
    });
  });

  const { data: accessories } = await supabase
    .from("accessory_products")
    .select("*")
    .or(`sku.ilike.%${q}%,name.ilike.%${q}%`)
    .gt("quantity", 0)
    .is("deleted_at", null)
    .limit(15);

  accessories?.forEach((a) => {
    results.push({
      id: a.id,
      product_type: "accessory",
      title: a.name,
      subtitle: `SKU: ${a.sku || "—"} · Stock: ${a.quantity}`,
      imei: null,
      quantity: 1,
      unit_price: Number(a.selling_price),
      purchase_unit_cost: Number(a.purchase_price),
      warranty_info: null,
      max_qty: a.quantity,
    });
  });

  return results;
}
