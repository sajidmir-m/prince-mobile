"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { saleDetailSections } from "@/lib/detail-fields";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";

type SaleRow = {
  id: string;
  sale_number: string;
  sale_date: string;
  payment_method: string | null;
  subtotal: number;
  tax_amount: number;
  discount: number;
  total_amount: number;
  notes: string | null;
  customers: { name: string; phone: string; email?: string; address?: string } | null;
  sale_items: {
    description: string;
    imei: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    warranty_info: string | null;
  }[];
};

export function SalesList() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [viewSale, setViewSale] = useState<SaleRow | null>(null);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("sales")
      .select("*, customers(name, phone, email, address), sale_items(description, imei, quantity, unit_price, total_price, warranty_info)")
      .is("deleted_at", null)
      .order("sale_date", { ascending: false });
    setSales((data as SaleRow[]) || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales History</h1>
          <p className="text-muted-foreground">View full sale & invoice details</p>
        </div>
        <Button onClick={() => (window.location.href = "/dashboard/sales/new")}>
          <Plus className="mr-2 h-4 w-4" />New Sale
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.sale_number}</TableCell>
                <TableCell>{s.customers?.name || "Walk-in"}</TableCell>
                <TableCell>{formatDateTime(s.sale_date)}</TableCell>
                <TableCell className="capitalize">{s.payment_method || "—"}</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(Number(s.total_amount))}
                </TableCell>
                <TableCell>
                  <RowActions onView={() => setViewSale(s)} hideEdit />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailDialog
        open={!!viewSale}
        onOpenChange={(o) => !o && setViewSale(null)}
        title={viewSale?.sale_number || "Sale Details"}
        subtitle={viewSale ? formatDateTime(viewSale.sale_date) : undefined}
        sections={viewSale ? saleDetailSections(viewSale) : undefined}
      />
    </div>
  );
}
