"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/upload";
import { logAudit } from "@/lib/audit";
import { getImeiQrData } from "@/lib/qr";
import { syncPurchaseRecord } from "@/lib/purchase-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { SecondHandDevice, Supplier } from "@/types/database";

const DOC_TYPES = [
  "Seller ID Card",
  "Purchase Agreement",
  "Original Mobile Bill",
  "Device Image",
  "Seller Signature",
];

export function SecondHandForm({
  suppliers = [],
  device,
  onSuccess,
}: {
  suppliers?: Supplier[];
  device?: SecondHandDevice | null;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!device;
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<Record<string, File | null>>({});
  const [form, setForm] = useState(() =>
    device
      ? {
          brand: device.brand,
          model: device.model,
          color: device.color || "",
          ram: device.ram || "",
          storage: device.storage || "",
          imei1: device.imei1,
          imei2: device.imei2 || "",
          condition: device.condition || "",
          accessories_included: device.accessories_included || "",
          battery_health: device.battery_health || "",
          remarks: device.remarks || "",
          seller_name: device.seller_name,
          seller_phone: device.seller_phone || "",
          seller_id_number: device.seller_id_number || "",
          seller_address: device.seller_address || "",
          supplier_id: (device as SecondHandDevice & { supplier_id?: string }).supplier_id || "",
          quantity: String((device as SecondHandDevice & { quantity?: number }).quantity ?? 1),
          purchase_date: device.purchase_date,
          purchase_price: String(device.purchase_price),
          selling_price: device.selling_price ? String(device.selling_price) : "",
          status: device.status,
        }
      : {
          brand: "",
          model: "",
          color: "",
          ram: "",
          storage: "",
          imei1: "",
          imei2: "",
          condition: "",
          accessories_included: "",
          battery_health: "",
          remarks: "",
          seller_name: "",
          seller_phone: "",
          seller_id_number: "",
          seller_address: "",
          supplier_id: "",
          quantity: "1",
          purchase_date: new Date().toISOString().split("T")[0],
          purchase_price: "",
          selling_price: "",
          status: "in_stock" as const,
        }
  );

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const getSellerLabel = () => {
    if (form.supplier_id) {
      return suppliers.find((s) => s.id === form.supplier_id)?.name || form.seller_name;
    }
    return form.seller_name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imei1 || !form.seller_name) {
      toast.error("IMEI and seller name are required");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const qty = Math.max(1, parseInt(form.quantity) || 1);
    const purchasePrice = parseFloat(form.purchase_price) || 0;
    const sellerLabel = getSellerLabel();

    const payload = {
      brand: form.brand,
      model: form.model,
      color: form.color || null,
      ram: form.ram || null,
      storage: form.storage || null,
      imei1: form.imei1,
      imei2: form.imei2 || null,
      condition: form.condition || null,
      accessories_included: form.accessories_included || null,
      battery_health: form.battery_health || null,
      remarks: form.remarks || null,
      seller_name: form.seller_name,
      seller_phone: form.seller_phone || null,
      seller_id_number: form.seller_id_number || null,
      seller_address: form.seller_address || null,
      supplier_id: form.supplier_id || null,
      quantity: qty,
      purchase_date: form.purchase_date,
      purchase_price: purchasePrice,
      selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
      status: isEdit ? form.status : "in_stock",
      qr_code_data: getImeiQrData(form.imei1, "second_hand"),
    };

    if (isEdit && device) {
      const { data, error } = await supabase
        .from("second_hand_devices")
        .update(payload)
        .eq("id", device.id)
        .select()
        .single();
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAudit("UPDATE", "second_hand_device", device.id, device, data);
      toast.success("Device updated");
      onSuccess?.() ?? router.push("/dashboard/inventory/second-hand");
      router.refresh();
      return;
    }

    const { data: newDevice, error } = await supabase
      .from("second_hand_devices")
      .insert(payload)
      .select()
      .single();

    if (error || !newDevice) {
      setLoading(false);
      toast.error(error?.message || "Failed to save");
      return;
    }

    for (const docType of DOC_TYPES) {
      const file = docs[docType];
      if (file) {
        const url = await uploadFile("second-hand-docs", file, newDevice.id);
        if (url) {
          await supabase.from("second_hand_documents").insert({
            device_id: newDevice.id,
            document_type: docType,
            file_url: url,
            file_name: file.name,
          });
        }
      }
    }

    try {
      const purchase = await syncPurchaseRecord({
        supplierId: form.supplier_id || null,
        supplierOrSellerName: sellerLabel,
        purchaseDate: form.purchase_date,
        description: `Second-hand: ${form.brand} ${form.model} (IMEI: ${form.imei1})`,
        quantity: qty,
        unitPrice: purchasePrice,
        productType: "second_hand",
        productId: newDevice.id,
      });
      await supabase
        .from("second_hand_devices")
        .update({ purchase_id: purchase.id })
        .eq("id", newDevice.id);
    } catch {
      toast.warning("Device saved but purchase sync failed");
    }

    await logAudit("CREATE", "second_hand_device", newDevice.id, null, newDevice);
    setLoading(false);
    toast.success("Second-hand device added & purchase synced");
    onSuccess?.() ?? router.push("/dashboard/inventory/second-hand");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Device Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {["brand", "model", "color", "ram", "storage", "imei1", "imei2", "condition", "battery_health", "quantity"].map((key) => (
            <div key={key} className="space-y-2">
              <Label className="capitalize">{key.replace("_", " ")}{key === "imei1" || key === "brand" ? " *" : ""}</Label>
              <Input
                type={key === "quantity" ? "number" : "text"}
                value={form[key as keyof typeof form]}
                onChange={(e) => update(key, e.target.value)}
                className={key.includes("imei") ? "font-mono" : ""}
                required={key === "imei1" || key === "brand"}
                min={key === "quantity" ? 1 : undefined}
              />
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label>Accessories Included</Label>
            <Input value={form.accessories_included} onChange={(e) => update("accessories_included", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Seller / Supplier</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {suppliers.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Link to Supplier (optional)</Label>
              <Select value={form.supplier_id} onValueChange={(v) => update("supplier_id", v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {["seller_name", "seller_phone", "seller_id_number", "seller_address", "purchase_date", "purchase_price", "selling_price"].map((key) => (
            <div key={key} className="space-y-2">
              <Label className="capitalize">{key.replace("_", " ")}{key === "seller_name" ? " *" : ""}</Label>
              <Input
                type={key.includes("price") ? "number" : key === "purchase_date" ? "date" : "text"}
                value={form[key as keyof typeof form]}
                onChange={(e) => update(key, e.target.value)}
                required={key === "seller_name"}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {!isEdit && (
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {DOC_TYPES.map((type) => (
              <div key={type} className="space-y-2">
                <Label>{type}</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setDocs((d) => ({ ...d, [type]: e.target.files?.[0] ?? null }))} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Device" : "Save Second-Hand Device"}
        </Button>
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
