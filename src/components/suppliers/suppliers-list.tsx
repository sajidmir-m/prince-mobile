"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteRecord } from "@/lib/purchase-sync";
import { logAudit } from "@/lib/audit";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { supplierDetailFields } from "@/lib/detail-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/types/database";

const empty = { name: "", phone: "", email: "", address: "", gst_number: "", notes: "" };

export function SuppliersList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("suppliers").select("*").is("deleted_at", null).order("name");
    setSuppliers((data as Supplier[]) || []);
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    if (editId) {
      const { data, error } = await supabase.from("suppliers").update(form).eq("id", editId).select().single();
      if (error) toast.error(error.message);
      else { await logAudit("UPDATE", "supplier", editId, null, data); toast.success("Updated"); setOpen(false); load(); }
    } else {
      const { data, error } = await supabase.from("suppliers").insert(form).select().single();
      if (error) toast.error(error.message);
      else { await logAudit("CREATE", "supplier", data.id, null, data); toast.success("Created"); setOpen(false); load(); }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button onClick={() => { setEditId(null); setForm(empty); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Supplier
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.phone || "—"}</TableCell>
                <TableCell>{s.email || "—"}</TableCell>
                <TableCell>
                  <RowActions
                    onView={() => setViewSupplier(s)}
                    onEdit={() => { setEditId(s.id); setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", gst_number: s.gst_number || "", notes: s.notes || "" }); setOpen(true); }}
                    onDelete={async () => {
                      if (!confirm(`Delete ${s.name}?`)) return;
                      try { await softDeleteRecord("suppliers", s.id, "supplier"); toast.success("Removed"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DetailDialog
        open={!!viewSupplier}
        onOpenChange={(o) => !o && setViewSupplier(null)}
        title={viewSupplier?.name || "Supplier"}
        fields={viewSupplier ? supplierDetailFields(viewSupplier) : undefined}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Supplier</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            {Object.keys(form).map((k) => (
              <div key={k} className="space-y-1">
                <Label className="capitalize">{k}</Label>
                <Input value={form[k as keyof typeof form]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === "name"} />
              </div>
            ))}
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
