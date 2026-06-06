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
import type { MobileDevice, Supplier } from "@/types/database";

const emptyForm = () => ({
  brand: "",
  model: "",
  color: "",
  ram: "",
  storage: "",
  imei1: "",
  imei2: "",
  serial_number: "",
  quantity: "1",
  purchase_price: "",
  selling_price: "",
  supplier_id: "",
  supplier_name: "",
  supplier_invoice_number: "",
  purchase_date: new Date().toISOString().split("T")[0],
  warranty_info: "",
  notes: "",
  status: "in_stock" as const,
});

export function MobileForm({
  suppliers,
  device,
  onSuccess,
}: {
  suppliers: Supplier[];
  device?: MobileDevice | null;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!device;
  const [loading, setLoading] = useState(false);
  const [billFile, setBillFile] = useState<File | null>(null);
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
          serial_number: device.serial_number || "",
          quantity: String((device as MobileDevice & { quantity?: number }).quantity ?? 1),
          purchase_price: String(device.purchase_price),
          selling_price: String(device.selling_price),
          supplier_id: device.supplier_id || "",
          supplier_name: device.supplier_name || "",
          supplier_invoice_number: device.supplier_invoice_number || "",
          purchase_date: device.purchase_date,
          warranty_info: device.warranty_info || "",
          notes: device.notes || "",
          status: device.status,
        }
      : emptyForm()
  );

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const getSupplierName = () => {
    if (form.supplier_id) {
      return suppliers.find((s) => s.id === form.supplier_id)?.name || form.supplier_name;
    }
    return form.supplier_name || "Unknown Supplier";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imei1 || !form.brand || !form.model) {
      toast.error("Brand, model, and IMEI 1 are required");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    let billUrl: string | null = device?.purchase_bill_url ?? null;

    if (billFile) {
      billUrl = await uploadFile("purchase-bills", billFile, "mobiles");
    }

    const qty = Math.max(1, parseInt(form.quantity) || 1);
    const purchasePrice = parseFloat(form.purchase_price) || 0;
    const sellingPrice = parseFloat(form.selling_price) || 0;
    const supplierName = getSupplierName();

    const payload = {
      brand: form.brand,
      model: form.model,
      color: form.color || null,
      ram: form.ram || null,
      storage: form.storage || null,
      imei1: form.imei1,
      imei2: form.imei2 || null,
      serial_number: form.serial_number || null,
      quantity: qty,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      supplier_id: form.supplier_id || null,
      supplier_name: supplierName,
      supplier_invoice_number: form.supplier_invoice_number || null,
      purchase_date: form.purchase_date,
      warranty_info: form.warranty_info || null,
      notes: form.notes || null,
      status: form.status,
      purchase_bill_url: billUrl,
      qr_code_data: getImeiQrData(form.imei1, "new"),
    };

    if (isEdit && device) {
      const { data, error } = await supabase
        .from("mobile_devices")
        .update(payload)
        .eq("id", device.id)
        .select()
        .single();

      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAudit("UPDATE", "mobile_device", device.id, device, data);
      toast.success("Mobile updated");
      onSuccess?.() ?? router.push("/dashboard/inventory/mobiles");
      router.refresh();
      return;
    }

    const { data, error } = await supabase
      .from("mobile_devices")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      setLoading(false);
      toast.error(error?.message || "Failed to save");
      return;
    }

    try {
      const purchase = await syncPurchaseRecord({
        supplierId: form.supplier_id || null,
        supplierOrSellerName: supplierName,
        purchaseDate: form.purchase_date,
        description: `${form.brand} ${form.model} (IMEI: ${form.imei1})`,
        quantity: qty,
        unitPrice: purchasePrice,
        productType: "mobile",
        productId: data.id,
        billUrl,
        invoiceNumber: form.supplier_invoice_number || undefined,
      });

      await supabase
        .from("mobile_devices")
        .update({ purchase_id: purchase.id })
        .eq("id", data.id);
    } catch (syncErr) {
      console.error(syncErr);
      toast.warning("Mobile saved but purchase sync failed");
    }

    await logAudit("CREATE", "mobile_device", data.id, null, data);
    setLoading(false);
    toast.success("Mobile added & purchase record synced");
    onSuccess?.() ?? router.push("/dashboard/inventory/mobiles");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Mobile" : "Add New Mobile"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Saving with a supplier auto-creates a matching purchase record
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand *" value={form.brand} onChange={(v) => update("brand", v)} />
          <Field label="Model *" value={form.model} onChange={(v) => update("model", v)} />
          <Field label="Color" value={form.color} onChange={(v) => update("color", v)} />
          <Field label="RAM" value={form.ram} onChange={(v) => update("ram", v)} />
          <Field label="Storage" value={form.storage} onChange={(v) => update("storage", v)} />
          <Field label="Quantity *" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
          <Field label="IMEI 1 *" value={form.imei1} onChange={(v) => update("imei1", v)} mono />
          <Field label="IMEI 2" value={form.imei2} onChange={(v) => update("imei2", v)} mono />
          <Field label="Serial Number" value={form.serial_number} onChange={(v) => update("serial_number", v)} />
          <Field label="Purchase Price *" value={form.purchase_price} onChange={(v) => update("purchase_price", v)} type="number" />
          <Field label="Selling Price *" value={form.selling_price} onChange={(v) => update("selling_price", v)} type="number" />
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select value={form.supplier_id} onValueChange={(v) => update("supplier_id", v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Supplier Name (if not in list)" value={form.supplier_name} onChange={(v) => update("supplier_name", v)} />
          <Field label="Supplier Invoice #" value={form.supplier_invoice_number} onChange={(v) => update("supplier_invoice_number", v)} />
          <Field label="Purchase Date *" value={form.purchase_date} onChange={(v) => update("purchase_date", v)} type="date" />
          {isEdit && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v ?? "in_stock")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Field label="Warranty Info" value={form.warranty_info} onChange={(v) => update("warranty_info", v)} />
          <div className="space-y-2 sm:col-span-2">
            <Label>Purchase Bill (PDF/Image)</Label>
            <Input type="file" accept="image/*,.pdf" onChange={(e) => setBillFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Mobile" : "Add to Inventory"}
            </Button>
            {onSuccess && (
              <Button type="button" variant="outline" onClick={onSuccess}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={mono ? "font-mono" : ""}
        required={label.includes("*")}
        min={type === "number" ? 1 : undefined}
      />
    </div>
  );
}
