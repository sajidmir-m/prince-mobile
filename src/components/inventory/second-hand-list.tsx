"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteRecord } from "@/lib/purchase-sync";
import { SecondHandForm } from "@/components/inventory/second-hand-form";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { secondHandDetailSections } from "@/lib/detail-fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import type { SecondHandDevice, Supplier } from "@/types/database";

export function SecondHandList() {
  const [devices, setDevices] = useState<SecondHandDevice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editDevice, setEditDevice] = useState<SecondHandDevice | null>(null);
  const [viewDevice, setViewDevice] = useState<SecondHandDevice | null>(null);
  const [viewDocs, setViewDocs] = useState<{ document_type: string; file_url: string }[]>([]);

  const openView = async (d: SecondHandDevice) => {
    setViewDevice(d);
    const supabase = createClient();
    const { data } = await supabase.from("second_hand_documents").select("document_type, file_url").eq("device_id", d.id);
    setViewDocs(data || []);
  };

  const load = async () => {
    const supabase = createClient();
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from("second_hand_devices").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").is("deleted_at", null).order("name"),
    ]);
    setDevices((d as SecondHandDevice[]) || []);
    setSuppliers((s as Supplier[]) || []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (device: SecondHandDevice) => {
    if (device.status === "sold") {
      toast.error("Cannot delete sold device");
      return;
    }
    if (!confirm(`Remove ${device.brand} ${device.model}?`)) return;
    try {
      await softDeleteRecord("second_hand_devices", device.id, "second_hand_device");
      toast.success("Device removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Second-Hand Mobiles</h1>
          <p className="text-muted-foreground">Purchases sync when device is added</p>
        </div>
        <Button onClick={() => (window.location.href = "/dashboard/inventory/second-hand/new")}>
          <Plus className="mr-2 h-4 w-4" />Add Device
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.brand} {d.model}</TableCell>
                <TableCell className="font-mono text-xs">
                  <Link href={`/dashboard/imei?q=${d.imei1}`} className="text-primary hover:underline">{d.imei1}</Link>
                </TableCell>
                <TableCell>{(d as SecondHandDevice & { quantity?: number }).quantity ?? 1}</TableCell>
                <TableCell>{d.seller_name}</TableCell>
                <TableCell>{formatCurrency(Number(d.purchase_price))}</TableCell>
                <TableCell><Badge variant="outline">{d.status.replace("_", " ")}</Badge></TableCell>
                <TableCell>
                  <RowActions
                    onView={() => openView(d)}
                    onEdit={() => setEditDevice(d)}
                    onDelete={() => handleDelete(d)}
                    disableDelete={d.status === "sold"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailDialog
        open={!!viewDevice}
        onOpenChange={(o) => { if (!o) { setViewDevice(null); setViewDocs([]); } }}
        title={viewDevice ? `${viewDevice.brand} ${viewDevice.model}` : "Details"}
        subtitle="Second-hand device"
        sections={viewDevice ? secondHandDetailSections(viewDevice, viewDocs) : undefined}
      />

      <Dialog open={!!editDevice} onOpenChange={(o) => !o && setEditDevice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Second-Hand</DialogTitle></DialogHeader>
          {editDevice && (
            <SecondHandForm
              suppliers={suppliers}
              device={editDevice}
              onSuccess={() => { setEditDevice(null); load(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
