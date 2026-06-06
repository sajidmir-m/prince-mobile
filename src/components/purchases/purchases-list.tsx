"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteRecord } from "@/lib/purchase-sync";
import { generateNumber, formatCurrency, formatDate } from "@/lib/format";
import { uploadFile } from "@/lib/upload";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { purchaseDetailSections } from "@/lib/detail-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/types/database";

type PurchaseRow = {
  id: string;
  purchase_number: string;
  supplier_id: string | null;
  seller_name: string | null;
  purchase_date: string;
  total_amount: number;
  payment_status: string;
  bill_url: string | null;
  notes: string | null;
  suppliers?: { name: string } | null;
  purchase_items?: {
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_type: string;
  }[];
};

export function PurchasesList() {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewPurchase, setViewPurchase] = useState<PurchaseRow | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    supplier_id: "",
    seller_name: "",
    purchase_date: new Date().toISOString().split("T")[0],
    description: "",
    quantity: "1",
    unit_price: "",
    total_amount: "",
    payment_status: "paid",
  });

  const load = async () => {
    const supabase = createClient();
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase
        .from("purchases")
        .select("*, suppliers(name), purchase_items(description, quantity, unit_price, total_price, product_type)")
        .is("deleted_at", null)
        .order("purchase_date", { ascending: false }),
      supabase.from("suppliers").select("*").is("deleted_at", null).order("name"),
    ]);
    setPurchases((p as PurchaseRow[]) || []);
    setSuppliers((s as Supplier[]) || []);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    let billUrl: string | null = null;
    if (billFile) billUrl = await uploadFile("purchase-bills", billFile, "purchases");

    const qty = parseInt(form.quantity) || 1;
    const unit = parseFloat(form.unit_price) || 0;
    const total = parseFloat(form.total_amount) || unit * qty;
    const supplierName = suppliers.find((s) => s.id === form.supplier_id)?.name || form.seller_name;

    if (editId) {
      const { error } = await supabase.from("purchases").update({
        supplier_id: form.supplier_id || null,
        seller_name: supplierName,
        purchase_date: form.purchase_date,
        total_amount: total,
        payment_status: form.payment_status,
        bill_url: billUrl,
      }).eq("id", editId);
      if (error) toast.error(error.message);
      else { toast.success("Purchase updated"); setOpen(false); load(); }
      return;
    }

    const purchaseNumber = generateNumber("PUR");
    const { data: purchase, error } = await supabase
      .from("purchases")
      .insert({
        purchase_number: purchaseNumber,
        supplier_id: form.supplier_id || null,
        seller_name: supplierName,
        purchase_date: form.purchase_date,
        total_amount: total,
        payment_status: form.payment_status,
        bill_url: billUrl,
      })
      .select()
      .single();

    if (error || !purchase) {
      toast.error(error?.message || "Failed");
      return;
    }

    await supabase.from("purchase_items").insert({
      purchase_id: purchase.id,
      product_type: "general",
      description: form.description,
      quantity: qty,
      unit_price: unit,
      total_price: total,
    });

    toast.success("Purchase created");
    setOpen(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Management</h1>
          <p className="text-muted-foreground">Includes auto-sync from mobile & second-hand inventory</p>
        </div>
        <Button onClick={() => { setEditId(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />New Purchase
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.purchase_number}</TableCell>
                <TableCell>{p.suppliers?.name || p.seller_name || "—"}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">
                  {p.purchase_items?.map((i) => i.description).join(", ") || "—"}
                </TableCell>
                <TableCell>{formatDate(p.purchase_date)}</TableCell>
                <TableCell>{formatCurrency(Number(p.total_amount))}</TableCell>
                <TableCell><Badge variant="outline">{p.payment_status}</Badge></TableCell>
                <TableCell>
                  <RowActions
                    onView={() => setViewPurchase(p)}
                    onEdit={() => {
                      setEditId(p.id);
                      setForm({
                        supplier_id: p.supplier_id || "",
                        seller_name: p.seller_name || "",
                        purchase_date: p.purchase_date,
                        description: p.purchase_items?.[0]?.description || "",
                        quantity: String(p.purchase_items?.[0]?.quantity || 1),
                        unit_price: "",
                        total_amount: String(p.total_amount),
                        payment_status: p.payment_status,
                      });
                      setOpen(true);
                    }}
                    onDelete={async () => {
                      if (!confirm("Delete this purchase?")) return;
                      try {
                        await softDeleteRecord("purchases", p.id, "purchase");
                        toast.success("Removed");
                        load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailDialog
        open={!!viewPurchase}
        onOpenChange={(o) => !o && setViewPurchase(null)}
        title={viewPurchase?.purchase_number || "Purchase"}
        subtitle={viewPurchase?.suppliers?.name || viewPurchase?.seller_name || undefined}
        sections={viewPurchase ? purchaseDetailSections(viewPurchase) : undefined}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Purchase</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description / Product</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required={!editId} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Qty</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unit Price</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Total</Label><Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
            {!editId && (
              <div className="space-y-2"><Label>Bill</Label><Input type="file" accept="image/*,.pdf" onChange={(e) => setBillFile(e.target.files?.[0] ?? null)} /></div>
            )}
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
