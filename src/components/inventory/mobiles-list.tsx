"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { softDeleteRecord } from "@/lib/purchase-sync";
import { MobileForm } from "@/components/inventory/mobile-form";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { mobileDetailSections } from "@/lib/detail-fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import type { MobileDevice, Supplier } from "@/types/database";

export function MobilesList() {
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editDevice, setEditDevice] = useState<MobileDevice | null>(null);
  const [viewDevice, setViewDevice] = useState<MobileDevice | null>(null);

  const load = async () => {
    const supabase = createClient();
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from("mobile_devices").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").is("deleted_at", null).order("name"),
    ]);
    setDevices((d as MobileDevice[]) || []);
    setSuppliers((s as Supplier[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (device: MobileDevice) => {
    if (device.status === "sold") {
      toast.error("Cannot delete sold device");
      return;
    }
    if (!confirm(`Remove ${device.brand} ${device.model}?`)) return;
    try {
      await softDeleteRecord("mobile_devices", device.id, "mobile_device");
      toast.success("Mobile removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const statusColor: Record<string, "default" | "secondary" | "outline"> = {
    in_stock: "default",
    reserved: "secondary",
    sold: "outline",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Mobile Inventory</h1>
          <p className="text-muted-foreground">IMEI-tracked devices · synced to purchases</p>
        </div>
        <Button onClick={() => window.location.href = "/dashboard/inventory/mobiles/new"}>
          <Plus className="mr-2 h-4 w-4" />
          Add Mobile
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Purchase</TableHead>
              <TableHead>Selling</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {d.brand} {d.model}
                  <p className="text-xs text-muted-foreground">{d.color}</p>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <Link href={`/dashboard/imei?q=${d.imei1}`} className="text-primary hover:underline">
                    {d.imei1}
                  </Link>
                </TableCell>
                <TableCell>{(d as MobileDevice & { quantity?: number }).quantity ?? 1}</TableCell>
                <TableCell className="text-sm">{d.ram} / {d.storage}</TableCell>
                <TableCell className="text-sm">{d.supplier_name || "—"}</TableCell>
                <TableCell>{formatCurrency(Number(d.purchase_price))}</TableCell>
                <TableCell>{formatCurrency(Number(d.selling_price))}</TableCell>
                <TableCell>
                  <Badge variant={statusColor[d.status]}>{d.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <RowActions
                    onView={() => setViewDevice(d)}
                    onEdit={() => setEditDevice(d)}
                    onDelete={() => handleDelete(d)}
                    disableDelete={d.status === "sold"}
                  />
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No devices in inventory
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DetailDialog
        open={!!viewDevice}
        onOpenChange={(o) => !o && setViewDevice(null)}
        title={viewDevice ? `${viewDevice.brand} ${viewDevice.model}` : "Mobile Details"}
        subtitle={viewDevice?.imei1}
        sections={viewDevice ? mobileDetailSections(viewDevice) : undefined}
      />

      <Dialog open={!!editDevice} onOpenChange={(o) => !o && setEditDevice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Mobile</DialogTitle>
          </DialogHeader>
          {editDevice && (
            <MobileForm
              suppliers={suppliers}
              device={editDevice}
              onSuccess={() => {
                setEditDevice(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
