"use client";

import { formatCurrency } from "@/lib/format";
import { STORE } from "@/lib/store-config";
import type { InvoiceCustomerInfo, InvoiceLineItem } from "@/types/invoice";
import { Separator } from "@/components/ui/separator";

export function InvoicePreview({
  storeName = STORE.name,
  storePhone = STORE.phone,
  storeEmail = STORE.email,
  storeAddress,
  storeGst,
  invoiceNumber,
  invoiceDate,
  customer,
  items,
  subtotal,
  taxAmount,
  taxRate = 0,
  discount,
  total,
  paymentMethod,
  notes,
}: {
  storeName?: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  storeGst?: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: InvoiceCustomerInfo;
  items: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  taxRate?: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
}) {
  return (
    <div className="rounded-lg border bg-white text-black shadow-sm text-sm">
      <div className="bg-primary px-4 py-3 text-primary-foreground text-center">
        <p className="font-bold text-base">{storeName}</p>
        {storeAddress && <p className="text-xs opacity-90 mt-0.5">{storeAddress}</p>}
        <p className="text-xs opacity-90 mt-1">
          {[storePhone && `Tel: ${storePhone}`, storeEmail, storeGst && `GST: ${storeGst}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Tax Invoice</p>
            <p className="font-mono font-medium">{invoiceNumber || "—"}</p>
            <p className="text-xs text-muted-foreground">{invoiceDate}</p>
            {paymentMethod && (
              <p className="text-xs capitalize mt-1">Payment: {paymentMethod}</p>
            )}
          </div>
          <div className="rounded border border-primary/30 bg-primary/5 p-3 min-w-[140px]">
            <p className="text-xs font-bold text-primary uppercase mb-1">Bill To</p>
            <p className="font-semibold">{customer.name || "—"}</p>
            {customer.phone && <p className="text-xs">Mobile: {customer.phone}</p>}
            {customer.address && <p className="text-xs text-muted-foreground">{customer.address}</p>}
            {customer.email && <p className="text-xs">{customer.email}</p>}
            {customer.gst_number && <p className="text-xs">GST: {customer.gst_number}</p>}
          </div>
        </div>

        <Separator />

        {items.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2">Item</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-dashed last:border-0">
                  <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2">
                    <p className="font-medium">{item.description}</p>
                    {item.imei && <p className="font-mono text-[10px] text-muted-foreground">IMEI: {item.imei}</p>}
                    {item.warranty && <p className="text-[10px] text-muted-foreground">Warranty: {item.warranty}</p>}
                  </td>
                  <td className="py-2 text-right">{item.qty}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-muted-foreground py-4 text-xs">Add products to preview invoice</p>
        )}

        <div className="space-y-1 text-xs border-t pt-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span>Tax ({taxRate}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {notes && (
          <p className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-medium">Notes:</span> {notes}
          </p>
        )}
      </div>
    </div>
  );
}
