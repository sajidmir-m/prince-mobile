"use client";

import { formatCurrency } from "@/lib/format";
import {
  getBankDetailLines,
  getCustomerDetailLines,
  getInvoiceItemDetailLines,
  getInvoiceMetaLines,
  hasBankDetails,
} from "@/lib/invoice-item-details";
import { STORE } from "@/lib/store-config";
import type { InvoiceBankDetails, InvoiceCustomerInfo, InvoiceLineItem } from "@/types/invoice";
import { Separator } from "@/components/ui/separator";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-neutral-50 p-4 min-w-[240px] flex-1 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
        <div className="h-1 w-14 bg-amber-500/80 rounded" />
      </div>
      {children}
    </div>
  );
}

function StepLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="border-t border-dashed border-black/15 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm break-all ${bold ? "font-bold" : "font-medium"}`}>{value}</p>
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
  bankDetails,
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
  bankDetails?: InvoiceBankDetails;
}) {
  const metaLines = getInvoiceMetaLines(invoiceNumber, invoiceDate, paymentMethod);
  const customerLines = getCustomerDetailLines(customer);
  const bankLines = bankDetails ? getBankDetailLines(bankDetails) : [];

  return (
    <div className="rounded-lg border bg-white text-black shadow-sm text-sm overflow-hidden">
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
        <div className="flex flex-col sm:flex-row gap-4">
          <SectionCard title="Tax Invoice">
            {metaLines.map((line) => (
              <StepLine
                key={line.label}
                label={line.label}
                value={line.label === "Invoice No." ? line.value : line.value}
                bold={line.label === "Invoice No."}
              />
            ))}
          </SectionCard>

          <SectionCard title="Bill To">
            {customerLines.map((line) => (
              <StepLine
                key={line.label}
                label={line.label}
                value={line.value}
                bold={line.label === "Customer Name"}
              />
            ))}
          </SectionCard>
        </div>

        <Separator />

        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, i) => {
              const detailLines = getInvoiceItemDetailLines(item.details);
              return (
                <div key={i} className="border-b border-black/20 pb-3 last:border-b-0">
                  <div className="flex justify-between gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 items-start">
                        <span className="text-muted-foreground text-xs shrink-0 pt-0.5">
                          {i + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{item.description}</p>
                          {detailLines.map((line) => (
                            <StepLine key={line.label} label={line.label} value={line.value} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs shrink-0 space-y-1 min-w-[90px]">
                      <StepLine label="Qty" value={String(item.qty)} />
                      <StepLine label="Rate" value={formatCurrency(item.unitPrice)} />
                      <div className="border-t border-dashed border-black/15 pt-2 mt-2">
                        <p className="text-[11px] text-muted-foreground font-medium">Amount</p>
                        <p className="text-sm font-bold">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4 text-xs">
            Add products to preview invoice
          </p>
        )}

        <Separator />

        <div className="flex justify-end">
          <div className="w-full max-w-[240px] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span className="font-medium">-{formatCurrency(discount)}</span>
              </div>
            )}
          </div>
        </div>

        {notes && (
          <>
            <Separator />
            <SectionCard title="Notes">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
            </SectionCard>
          </>
        )}

        <div className="border-t-2 border-black pt-3">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Grand Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {hasBankDetails(bankDetails) && bankLines.length > 0 && (
          <>
            <Separator />
            <SectionCard title="Bank Details">
              {bankLines.map((line) => (
                <StepLine
                  key={line.label}
                  label={line.label}
                  value={line.value}
                  bold={line.label === "Account Number"}
                />
              ))}
            </SectionCard>
          </>
        )}

        <div className="border-t pt-3 text-center text-[10px] text-muted-foreground space-y-0.5">
          <p>Thank you for shopping at {storeName}</p>
          <p>Goods sold are not returnable unless stated in warranty.</p>
        </div>
      </div>
    </div>
  );
}
