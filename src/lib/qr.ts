export function getImeiQrData(imei: string, type: "new" | "second_hand" = "new") {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/dashboard/imei?q=${encodeURIComponent(imei)}&type=${type}`;
}

export function getSkuQrData(sku: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/dashboard/inventory/accessories?sku=${encodeURIComponent(sku)}`;
}
