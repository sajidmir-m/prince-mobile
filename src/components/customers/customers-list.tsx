"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteRecord } from "@/lib/purchase-sync";
import { logAudit } from "@/lib/audit";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { customerDetailFields } from "@/lib/detail-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/types/database";

const empty = { name: "", phone: "", address: "", email: "", gst_number: "" };

export function CustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("customers").select("*").is("deleted_at", null).order("name");
    const list = (data as Customer[]) || [];
    setCustomers(list);
    const ids = list.map((c) => c.id);
    if (ids.length) {
      const { data: sales } = await supabase.from("sales").select("customer_id, total_amount").in("customer_id", ids).is("deleted_at", null);
      const t: Record<string, number> = {};
      sales?.forEach((s) => {
        if (s.customer_id) t[s.customer_id] = (t[s.customer_id] || 0) + Number(s.total_amount);
      });
      setTotals(t);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone, address: c.address || "", email: c.email || "", gst_number: c.gst_number || "" });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    if (editId) {
      const { data, error } = await supabase.from("customers").update(form).eq("id", editId).select().single();
      if (error) toast.error(error.message);
      else { await logAudit("UPDATE", "customer", editId, null, data); toast.success("Updated"); setOpen(false); load(); }
    } else {
      const { data, error } = await supabase.from("customers").insert(form).select().single();
      if (error) toast.error(error.message);
      else { await logAudit("CREATE", "customer", data.id, null, data); toast.success("Created"); setOpen(false); load(); }
    }
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await softDeleteRecord("customers", c.id, "customer");
      toast.success("Removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Create, edit, delete customers</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.email || "—"}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals[c.id] || 0)}</TableCell>
                <TableCell>
                  <RowActions
                    onView={() => setViewCustomer(c)}
                    onEdit={() => openEdit(c)}
                    onDelete={() => remove(c)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DetailDialog
        open={!!viewCustomer}
        onOpenChange={(o) => !o && setViewCustomer(null)}
        title={viewCustomer?.name || "Customer"}
        subtitle={viewCustomer?.phone}
        fields={viewCustomer ? customerDetailFields(viewCustomer, totals[viewCustomer.id]) : undefined}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Customer</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            {(["name", "phone", "address", "email", "gst_number"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label className="capitalize">{k.replace("_", " ")}</Label>
                <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required={k === "name" || k === "phone"} />
              </div>
            ))}
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
