"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateSku } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { softDeleteRecord } from "@/lib/purchase-sync";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { accessoryDetailFields } from "@/lib/detail-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { AccessoryProduct, Category } from "@/types/database";

const emptyForm = {
  name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  quantity: "",
};

export default function AccessoriesPage() {
  const [products, setProducts] = useState<AccessoryProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<AccessoryProduct | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const supabase = createClient();
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("accessory_products").select("*").is("deleted_at", null).order("name"),
      supabase.from("categories").select("*").is("deleted_at", null).order("name"),
    ]);
    setProducts((p as AccessoryProduct[]) || []);
    setCategories((c as Category[]) || []);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: AccessoryProduct) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      category_id: p.category_id || "",
      purchase_price: String(p.purchase_price),
      selling_price: String(p.selling_price),
      quantity: String(p.quantity),
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const qty = parseInt(form.quantity) || 0;
    const payload = {
      name: form.name,
      category_id: form.category_id || null,
      purchase_price: parseFloat(form.purchase_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      quantity: qty,
      stock_status: qty === 0 ? "out_of_stock" as const : qty <= 5 ? "low_stock" as const : "in_stock" as const,
    };

    if (editId) {
      const { data, error } = await supabase.from("accessory_products").update(payload).eq("id", editId).select().single();
      if (error) toast.error(error.message);
      else {
        await logAudit("UPDATE", "accessory_product", editId, null, data);
        toast.success("Product updated");
        setOpen(false);
        load();
      }
      return;
    }

    const { data, error } = await supabase
      .from("accessory_products")
      .insert({ ...payload, sku: generateSku() })
      .select()
      .single();

    if (error) toast.error(error.message);
    else {
      await logAudit("CREATE", "accessory_product", data.id, null, data);
      toast.success("Product added");
      setOpen(false);
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accessories Inventory</h1>
          <p className="text-muted-foreground">Full CRUD · stock decreases on sale</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Product</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Purchase</TableHead>
              <TableHead>Selling</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell>{p.quantity}</TableCell>
                <TableCell>{Number(p.purchase_price).toLocaleString()}</TableCell>
                <TableCell>{Number(p.selling_price).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={p.stock_status === "in_stock" ? "default" : "destructive"}>
                    {p.stock_status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <RowActions
                    onView={() => setViewProduct(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={async () => {
                      if (!confirm(`Delete ${p.name}?`)) return;
                      try {
                        await softDeleteRecord("accessory_products", p.id, "accessory_product");
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
        open={!!viewProduct}
        onOpenChange={(o) => !o && setViewProduct(null)}
        title={viewProduct?.name || "Product"}
        subtitle={viewProduct?.sku || undefined}
        fields={viewProduct ? accessoryDetailFields(viewProduct) : undefined}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Accessory</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Purchase Price</Label><Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></div>
              <div className="space-y-2"><Label>Selling Price</Label><Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
