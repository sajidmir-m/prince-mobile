import { createClient } from "@/lib/supabase/client";
import type { ImeiHistory, MobileDevice, SecondHandDevice } from "@/types/database";

export async function fetchImeiHistory(imei: string): Promise<ImeiHistory> {
  const supabase = createClient();
  const normalized = imei.trim();

  const { data: mobile } = await supabase
    .from("mobile_devices")
    .select("*")
    .or(`imei1.eq.${normalized},imei2.eq.${normalized}`)
    .is("deleted_at", null)
    .maybeSingle();

  if (mobile) {
    return buildMobileHistory(mobile as MobileDevice, supabase);
  }

  const { data: secondHand } = await supabase
    .from("second_hand_devices")
    .select("*")
    .or(`imei1.eq.${normalized},imei2.eq.${normalized}`)
    .is("deleted_at", null)
    .maybeSingle();

  if (secondHand) {
    return buildSecondHandHistory(secondHand as SecondHandDevice, supabase);
  }

  return {
    device: null,
    deviceType: null,
    purchase: null,
    sale: null,
    documents: [],
  };
}

async function buildMobileHistory(
  device: MobileDevice,
  supabase: ReturnType<typeof createClient>
): Promise<ImeiHistory> {
  const { data: saleItem } = await supabase
    .from("sale_items")
    .select("*, sales(*, customers(*)), invoices(*)")
    .eq("imei", device.imei1)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sale = saleItem?.sales;
  const customer = sale?.customers;
  const invoice = saleItem?.invoices?.[0] ?? saleItem?.invoices;

  return {
    device,
    deviceType: "new",
    purchase: {
      date: device.purchase_date,
      supplier: device.supplier_name || "—",
      cost: device.purchase_price,
      billUrl: device.purchase_bill_url,
    },
    sale: sale
      ? {
          customerName: customer?.name || "Walk-in",
          customerPhone: customer?.phone || "—",
          invoiceNumber: invoice?.invoice_number || sale.sale_number,
          saleDate: sale.sale_date,
          salePrice: saleItem?.total_price || sale.total_amount,
        }
      : null,
    documents: device.purchase_bill_url
      ? [{ type: "Purchase Bill", url: device.purchase_bill_url }]
      : [],
  };
}

async function buildSecondHandHistory(
  device: SecondHandDevice,
  supabase: ReturnType<typeof createClient>
): Promise<ImeiHistory> {
  const { data: docs } = await supabase
    .from("second_hand_documents")
    .select("*")
    .eq("device_id", device.id);

  const { data: saleItem } = await supabase
    .from("sale_items")
    .select("*, sales(*, customers(*)), invoices(*)")
    .eq("imei", device.imei1)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sale = saleItem?.sales;
  const customer = sale?.customers;
  const invoice = saleItem?.invoices?.[0] ?? saleItem?.invoices;

  return {
    device,
    deviceType: "second_hand",
    purchase: {
      date: device.purchase_date,
      supplier: device.seller_name,
      cost: device.purchase_price,
      billUrl: null,
    },
    sale: sale
      ? {
          customerName: customer?.name || "Walk-in",
          customerPhone: customer?.phone || "—",
          invoiceNumber: invoice?.invoice_number || sale.sale_number,
          saleDate: sale.sale_date,
          salePrice: saleItem?.total_price || sale.total_amount,
        }
      : null,
    documents: (docs || []).map((d) => ({
      type: d.document_type,
      url: d.file_url,
    })),
  };
}
