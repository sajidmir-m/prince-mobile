"use client";

import { formatCurrency } from "@/lib/format";
import { STORE } from "@/lib/store-config";
import type { InvoiceCustomerInfo, InvoiceLineItem } from "@/types/invoice";
import { Separator } from "@/components/ui/separator";

function ItemLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-dashed border-black/15 pt-1 mt-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-mono text-[11px]">{value}</p>
    </div>
  );
}

export function InvoicePreview({
  storeName = STORE.name,
  storeLogoUrl = STORE.logo,
  storePhone = STORE.phone,
  storeEmail = STORE.email,
  storeAddress = STORE.address,
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
  storeLogoUrl?: string;
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
    <div className="rounded-lg border bg-white text-black shadow-sm text-sm overflow-hidden">
      {/* Store header */}
      <div className="bg-black px-4 py-4 text-white text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={storeLogoUrl}
          alt={storeName}
          className="mx-auto h-16 w-auto object-contain mb-2"
        />
        <p className="font-bold text-base tracking-wide">{storeName}</p>
        {storeAddress && <p className="text-xs opacity-90 mt-1">{storeAddress}</p>}
        <p className="text-xs opacity-90 mt-1">
          {[storePhone && `Tel: ${storePhone}`, storeEmail, storeGst && `GST: ${storeGst}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Invoice meta + Bill To */}
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">Tax Invoice</p>
            <div className="mt-2 space-y-0.5 text-xs">
              <p>
                <span className="text-muted-foreground">Invoice No:</span>{" "}
                <span className="font-mono font-medium">{invoiceNumber || "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Date:</span> {invoiceDate}
              </p>
              {paymentMethod && (
                <p>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  <span className="capitalize">{paymentMethod.replace("_", " ")}</span>
                </p>
              )}
            </div>
          </div>
          <div className="rounded border border-black/20 bg-neutral-50 p-3 min-w-[150px]">
            <p className="text-xs font-bold uppercase mb-1.5">Bill To</p>
            <p className="font-semibold">{customer.name || "—"}</p>
            {customer.phone && <p className="text-xs mt-0.5">Mobile: {customer.phone}</p>}
            {customer.address && (
              <p className="text-xs text-muted-foreground mt-0.5">{customer.address}</p>
            )}
            {customer.email && <p className="text-xs mt-0.5">{customer.email}</p>}
            {customer.gst_number && <p className="text-xs mt-0.5">GST: {customer.gst_number}</p>}
          </div>
        </div>

        <Separator />

        {/* Line items */}
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="border-b border-black/20 pb-3 last:border-b-0">
                <div className="flex justify-between gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 items-start">
                      <span className="text-muted-foreground text-xs shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.description}</p>
                        {item.imei && <ItemLine label="IMEI" value={item.imei} />}
                        {item.warranty && <ItemLine label="Warranty" value={item.warranty} />}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0 space-y-0.5">
                    <p>
                      <span className="text-muted-foreground">Qty:</span> {item.qty}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Rate:</span> {formatCurrency(item.unitPrice)}
                    </p>
                    <p className="font-semibold">
                      <span className="text-muted-foreground font-normal">Amt:</span>{" "}
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4 text-xs">Add products to preview invoice</p>
        )}

        <Separator />

        {/* Subtotals */}
        <div className="flex justify-end">
          <div className="w-full max-w-[220px] space-y-1 text-xs">
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
          </div>
        </div>

        {notes && (
          <>
            <Separator />
            <div className="rounded-md border border-black/10 bg-neutral-50 p-3">
              <p className="text-sm font-semibold mb-1">Notes</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
            </div>
          </>
        )}

        {/* Grand total — always last */}
        <div className="border-t-2 border-black pt-3">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Grand Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-3 text-center text-[10px] text-muted-foreground space-y-0.5">
          <p>Thank you for shopping at {storeName}</p>
          <p>Goods sold are not returnable unless stated in warranty.</p>
        </div>
      </div>
    </div>
  );
}
