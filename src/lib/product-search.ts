import { createClient } from "@/lib/supabase/client";
import {
  buildProductOrFilter,
  filterAndRankSearchResults,
  type SearchableFields,
} from "@/lib/search-utils";
import type { InvoiceItemDetails } from "@/types/invoice";

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
  details: InvoiceItemDetails;
}

export async function searchProducts(query: string): Promise<SearchResultItem[]> {
  const supabase = createClient();
  const q = query.trim();
  if (!q) return [];

  const candidates: { item: SearchResultItem; fields: SearchableFields }[] = [];

  const { data: mobiles } = await supabase
    .from("mobile_devices")
    .select("*")
    .or(buildProductOrFilter(q, { model: true, brand: true, imei: true }))
    .in("status", ["in_stock", "reserved"])
    .is("deleted_at", null)
    .limit(30);

  mobiles?.forEach((m) => {
    const qty = m.quantity ?? 1;
    candidates.push({
      item: {
        id: m.id,
        product_type: "mobile",
        title: `${m.brand} ${m.model}`,
        subtitle: [m.ram, m.storage, m.color, m.imei1 && `IMEI: ${m.imei1}`]
          .filter(Boolean)
          .join(" · "),
        imei: m.imei1,
        quantity: 1,
        unit_price: Number(m.selling_price),
        purchase_unit_cost: Number(m.purchase_price),
        warranty_info: m.warranty_info,
        max_qty: qty,
        details: {
          productType: "mobile",
          brand: m.brand,
          model: m.model,
          color: m.color,
          ram: m.ram,
          storage: m.storage,
          imei1: m.imei1,
          imei2: m.imei2,
          serialNumber: m.serial_number,
          warranty: m.warranty_info,
        },
      },
      fields: { brand: m.brand, model: m.model, imei: m.imei1, imei2: m.imei2 },
    });
  });

  const { data: shDevices } = await supabase
    .from("second_hand_devices")
    .select("*")
    .or(buildProductOrFilter(q, { model: true, brand: true, seller: true, imei: true }))
    .eq("status", "in_stock")
    .is("deleted_at", null)
    .limit(30);

  shDevices?.forEach((d) => {
    const qty = d.quantity ?? 1;
    candidates.push({
      item: {
        id: d.id,
        product_type: "second_hand",
        title: `${d.brand} ${d.model} (Used)`,
        subtitle: [d.ram, d.storage, d.color, `IMEI: ${d.imei1}`].filter(Boolean).join(" · "),
        imei: d.imei1,
        quantity: 1,
        unit_price: Number(d.selling_price || d.purchase_price) * 1.15,
        purchase_unit_cost: Number(d.purchase_price),
        warranty_info: null,
        max_qty: qty,
        details: {
          productType: "second_hand",
          brand: d.brand,
          model: d.model,
          color: d.color,
          ram: d.ram,
          storage: d.storage,
          imei1: d.imei1,
          imei2: d.imei2,
          condition: d.condition,
          batteryHealth: d.battery_health,
          accessoriesIncluded: d.accessories_included,
        },
      },
      fields: { brand: d.brand, model: d.model, imei: d.imei1, imei2: d.imei2, seller_name: d.seller_name },
    });
  });

  const [{ data: accessories }, { data: categories }] = await Promise.all([
    supabase
      .from("accessory_products")
      .select("*")
      .or(buildProductOrFilter(q, { name: true, sku: true }))
      .gt("quantity", 0)
      .is("deleted_at", null)
      .limit(30),
    supabase.from("categories").select("id, name").is("deleted_at", null),
  ]);

  const categoryMap = new Map((categories || []).map((c) => [c.id, c.name]));

  accessories?.forEach((a) => {
    candidates.push({
      item: {
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
        details: {
          productType: "accessory",
          sku: a.sku,
          category: a.category_id ? categoryMap.get(a.category_id) || null : null,
        },
      },
      fields: { name: a.name, sku: a.sku || undefined },
    });
  });

  return filterAndRankSearchResults(q, candidates, (c) => c.fields)
    .map((c) => c.item)
    .slice(0, 15);
}
