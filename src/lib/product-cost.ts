import { createClient } from "@/lib/supabase/client";

export async function getPurchaseUnitCost(
  productType: string,
  productId: string
): Promise<number> {
  const supabase = createClient();

  if (productType === "mobile") {
    const { data } = await supabase
      .from("mobile_devices")
      .select("purchase_price")
      .eq("id", productId)
      .single();
    return Number(data?.purchase_price) || 0;
  }

  if (productType === "second_hand") {
    const { data } = await supabase
      .from("second_hand_devices")
      .select("purchase_price")
      .eq("id", productId)
      .single();
    return Number(data?.purchase_price) || 0;
  }

  if (productType === "accessory") {
    const { data } = await supabase
      .from("accessory_products")
      .select("purchase_price")
      .eq("id", productId)
      .single();
    return Number(data?.purchase_price) || 0;
  }

  return 0;
}
