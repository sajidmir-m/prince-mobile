"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Plus, FileDown, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { generateNumber } from "@/lib/format";
import { downloadInvoicePdf, printInvoicePdf } from "@/lib/pdf/invoice";
import { getImeiQrData } from "@/lib/qr";
import { searchProducts, type SearchResultItem } from "@/lib/product-search";
import { InvoicePreview } from "@/components/sales/invoice-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { STORE } from "@/lib/store-config";
import type { Customer } from "@/types/database";
import type {
  InvoiceBankDetails,
  InvoiceCustomerInfo,
  InvoiceData,
  InvoiceItemDetails,
} from "@/types/invoice";

interface CartItem {
  product_type: string;
  product_id: string;
  description: string;
  imei: string | null;
  quantity: number;
  unit_price: number;
  purchase_unit_cost: number;
  warranty_info: string | null;
  max_qty: number;
  details: InvoiceItemDetails;
}

const emptyCustomer = (): InvoiceCustomerInfo => ({
  name: "",
  phone: "",
  address: "",
  email: "",
  gst_number: "",
});

export function NewSaleForm({
  customers,
  taxRate = 0,
  storeName = STORE.name,
  storeLogoUrl = STORE.logo,
  storePhone = STORE.phone,
  storeEmail = STORE.email,
  storeAddress = STORE.address,
  storeGst = "",
  bankDetails,
}: {
  customers: Customer[];
  taxRate?: number;
  storeName?: string;
  storeLogoUrl?: string;
  storePhone?: string;
  storeEmail?: string;
  storeAddress?: string;
  storeGst?: string;
  bankDetails?: InvoiceBankDetails;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerTab, setCustomerTab] = useState<"manual" | "existing">("manual");
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState<InvoiceCustomerInfo>(emptyCustomer());
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const previewInvoiceNumber = useMemo(() => generateNumber("INV"), []);
  const invoiceDate = new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = Math.max(0, subtotal + taxAmount - discount);

  const invoiceItems = cart.map((i) => ({
    description: i.description,
    details: i.details,
    qty: i.quantity,
    unitPrice: i.unit_price,
    total: i.unit_price * i.quantity,
  }));

  const buildInvoiceData = (invoiceNumber: string): InvoiceData => ({
    storeName,
    storeLogoUrl,
    storeAddress: storeAddress || undefined,
    storePhone,
    storeEmail,
    storeGst: storeGst || undefined,
    invoiceNumber,
    invoiceDate,
    customer: {
      name: customer.name.trim() || "Walk-in Customer",
      phone: customer.phone.trim(),
      address: customer.address?.trim() || undefined,
      email: customer.email?.trim() || undefined,
      gst_number: customer.gst_number?.trim() || undefined,
    },
    items: invoiceItems,
    subtotal,
    taxAmount,
    taxRate,
    discount,
    total,
    paymentMethod,
    notes: invoiceNotes.trim() || undefined,
    bankDetails,
    qrData: cart.find((c) => c.imei)?.imei
      ? getImeiQrData(cart.find((c) => c.imei)!.imei!)
      : undefined,
  });

  const fillFromExisting = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomer({
        name: c.name,
        phone: c.phone,
        address: c.address || "",
        email: c.email || "",
        gst_number: c.gst_number || "",
      });
    }
  };

  const updateCustomer = (key: keyof InvoiceCustomerInfo, value: string) => {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  };

  const runSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    const items = await searchProducts(search);
    setResults(items);
    setSearching(false);
    if (items.length === 0) toast.error("No products found");
  };

  const selectProduct = (item: SearchResultItem) => {
    if (cart.some((c) => c.product_id === item.id && c.product_type === item.product_type)) {
      toast.info("Already in cart");
      return;
    }
    setCart([
      ...cart,
      {
        product_type: item.product_type,
        product_id: item.id,
        description: item.title,
        imei: item.imei,
        quantity: 1,
        unit_price: item.unit_price,
        purchase_unit_cost: item.purchase_unit_cost,
        warranty_info: item.warranty_info,
        max_qty: item.max_qty,
        details: item.details,
      },
    ]);
    toast.success("Added to cart");
  };

  const updateCartQty = (index: number, qty: number) => {
    const item = cart[index];
    const q = Math.min(Math.max(1, qty), item.max_qty);
    setCart(cart.map((c, i) => (i === index ? { ...c, quantity: q } : c)));
  };

  const updateCartPrice = (index: number, price: number) => {
    setCart(cart.map((c, i) => (i === index ? { ...c, unit_price: Math.max(0, price) } : c)));
  };

  const resolveCustomerId = async (supabase: ReturnType<typeof createClient>) => {
    if (customerTab === "existing" && customerId) return customerId;

    if (!customer.name.trim() || !customer.phone.trim()) {
      return null;
    }

    if (!saveCustomer) return null;

    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", customer.phone.trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("customers")
        .update({
          name: customer.name.trim(),
          address: customer.address?.trim() || null,
          email: customer.email?.trim() || null,
          gst_number: customer.gst_number?.trim() || null,
        })
        .eq("id", existing.id);
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from("customers")
      .insert({
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address?.trim() || null,
        email: customer.email?.trim() || null,
        gst_number: customer.gst_number?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return null;
    return created?.id ?? null;
  };

  const completeSale = async (action: "download" | "print" | "both" = "download") => {
    if (cart.length === 0) {
      toast.error("Add at least one product to the invoice");
      return;
    }
    if (!customer.name.trim()) {
      toast.error("Customer name is required on the invoice");
      return;
    }
    if (!customer.phone.trim()) {
      toast.error("Customer mobile number is required on the invoice");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const saleNumber = generateNumber("SALE");
    const invoiceNumber = previewInvoiceNumber;
    const finalCustomerId = await resolveCustomerId(supabase);

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        sale_number: saleNumber,
        customer_id: finalCustomerId,
        subtotal,
        tax_amount: taxAmount,
        discount,
        total_amount: total,
        payment_method: paymentMethod,
        notes: invoiceNotes.trim() || null,
      })
      .select()
      .single();

    if (saleError || !sale) {
      setLoading(false);
      toast.error(saleError?.message || "Sale failed");
      return;
    }

    await supabase.from("sale_items").insert(
      cart.map((item) => {
        const totalPrice = item.unit_price * item.quantity;
        const totalCost = item.purchase_unit_cost * item.quantity;
        return {
          sale_id: sale.id,
          product_type: item.product_type,
          product_id: item.product_id,
          description: item.description,
          imei: item.imei,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: totalPrice,
          purchase_unit_cost: item.purchase_unit_cost,
          profit: totalPrice - totalCost,
          warranty_info: item.warranty_info,
        };
      })
    );

    for (const item of cart) {
      if (item.product_type === "mobile") {
        const { data: m } = await supabase
          .from("mobile_devices")
          .select("quantity, status")
          .eq("id", item.product_id)
          .single();
        if (m) {
          const newQty = (m.quantity ?? 1) - item.quantity;
          await supabase
            .from("mobile_devices")
            .update({
              quantity: Math.max(0, newQty),
              status: newQty <= 0 ? "sold" : m.status,
            })
            .eq("id", item.product_id);
        }
        await logAudit("SOLD", "mobile_device", item.product_id, null, { quantity: item.quantity });
      } else if (item.product_type === "second_hand") {
        await supabase.from("second_hand_devices").update({ status: "sold", quantity: 0 }).eq("id", item.product_id);
      } else if (item.product_type === "accessory") {
        const { data: acc } = await supabase
          .from("accessory_products")
          .select("quantity")
          .eq("id", item.product_id)
          .single();
        if (acc) {
          const newQty = Math.max(0, acc.quantity - item.quantity);
          await supabase
            .from("accessory_products")
            .update({
              quantity: newQty,
              stock_status: newQty === 0 ? "out_of_stock" : newQty <= 5 ? "low_stock" : "in_stock",
            })
            .eq("id", item.product_id);
        }
      }
    }

    const invoicePayload = buildInvoiceData(invoiceNumber);

    await supabase.from("invoices").insert({
      invoice_number: invoiceNumber,
      sale_id: sale.id,
      customer_id: finalCustomerId,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      payment_method: paymentMethod,
      qr_code_data: invoicePayload.qrData ?? null,
    });

    await logAudit("CREATE", "sale", sale.id, null, sale);

    if (action === "download" || action === "both") {
      downloadInvoicePdf(invoicePayload);
    }
    if (action === "print" || action === "both") {
      printInvoicePdf(invoicePayload);
    }

    setLoading(false);
    toast.success("Sale completed & invoice generated");
    router.push("/dashboard/sales");
    router.refresh();
  };

  const previewPdf = () => {
    if (cart.length === 0) {
      toast.error("Add products first");
      return;
    }
    if (!customer.name.trim()) {
      toast.error("Enter customer name for preview");
      return;
    }
    downloadInvoicePdf(buildInvoiceData(previewInvoiceNumber + "-PREVIEW"));
    toast.success("Preview PDF downloaded");
  };

  const typeBadge: Record<string, string> = {
    mobile: "New Mobile",
    second_hand: "Second-Hand",
    accessory: "Accessory",
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="xl:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <p className="text-sm text-muted-foreground">Search and add items to invoice</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="IMEI / Model / SKU / Name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
                className="font-mono"
              />
              <Button type="button" onClick={runSearch} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {results.length > 0 && (
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={`${r.product_type}-${r.id}`}
                    type="button"
                    onClick={() => selectProduct(r)}
                    className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{typeBadge[r.product_type]}</Badge>
                      <span className="text-sm font-semibold">{r.unit_price.toLocaleString()}</span>
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoice Items ({cart.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cart.map((item, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    {item.imei && <p className="font-mono text-xs text-muted-foreground">IMEI: {item.imei}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setCart(cart.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      className="h-8"
                      min={1}
                      max={item.max_qty}
                      value={item.quantity}
                      onChange={(e) => updateCartQty(i, Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      className="h-8"
                      value={item.unit_price}
                      onChange={(e) => updateCartPrice(i, Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Line Total / Profit</Label>
                    <p className="h-8 flex flex-col justify-center font-semibold text-sm leading-tight">
                      <span>{(item.unit_price * item.quantity).toLocaleString()}</span>
                      <span className="text-xs font-normal text-green-700">
                        Profit: {((item.unit_price - item.purchase_unit_cost) * item.quantity).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No items on invoice yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="xl:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer & Invoice Details</CardTitle>
            <p className="text-sm text-muted-foreground">Fill in details that appear on the printed invoice</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={customerTab} onValueChange={(v) => setCustomerTab(v as "manual" | "existing")}>
              <TabsList className="w-full">
                <TabsTrigger value="manual" className="flex-1">New / Walk-in</TabsTrigger>
                <TabsTrigger value="existing" className="flex-1">Existing Customer</TabsTrigger>
              </TabsList>
              <TabsContent value="existing" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>Select Customer</Label>
                  <Select
                    value={customerId}
                    onValueChange={(v) => {
                      fillFromExisting(v ?? "");
                      setCustomerTab("existing");
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Customer Name *</Label>
                <Input
                  placeholder="e.g. Ahmed Khan"
                  value={customer.name}
                  onChange={(e) => updateCustomer("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input
                  placeholder="e.g. 03001234567"
                  value={customer.phone}
                  onChange={(e) => updateCustomer("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="optional"
                  value={customer.email}
                  onChange={(e) => updateCustomer("email", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input
                  placeholder="Customer address"
                  value={customer.address}
                  onChange={(e) => updateCustomer("address", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Customer GST (optional)</Label>
                <Input
                  placeholder="GST / NTN number"
                  value={customer.gst_number}
                  onChange={(e) => updateCustomer("gst_number", e.target.value)}
                />
              </div>
            </div>

            {customerTab === "manual" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-customer"
                  checked={saveCustomer}
                  onCheckedChange={(c) => setSaveCustomer(!!c)}
                />
                <Label htmlFor="save-customer" className="text-sm font-normal cursor-pointer">
                  Save customer to database for next time
                </Label>
              </div>
            )}

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "cash")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="easypaisa">Easypaisa / JazzCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount (Rs.)</Label>
                <Input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Invoice Notes</Label>
              <Textarea
                placeholder="Warranty terms, thank you message, etc."
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toLocaleString()}</span></div>
              {taxRate > 0 && (
                <div className="flex justify-between"><span>Tax ({taxRate}%)</span><span>{taxAmount.toLocaleString()}</span></div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-green-700"><span>Discount</span><span>-{discount.toLocaleString()}</span></div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Grand Total</span><span>{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => completeSale("download")}
                disabled={loading || cart.length === 0}
              >
                {loading ? "Processing..." : "Complete Sale & Download Invoice"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={previewPdf}
                  disabled={cart.length === 0}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Preview PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => completeSale("both")}
                  disabled={loading || cart.length === 0}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Sale + Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="text-sm font-medium mb-2 text-muted-foreground">Live Invoice Preview</p>
          <InvoicePreview
            storeName={storeName}
            storeLogoUrl={storeLogoUrl}
            storePhone={storePhone}
            storeEmail={storeEmail}
            storeAddress={storeAddress}
            storeGst={storeGst}
            invoiceNumber={previewInvoiceNumber}
            invoiceDate={invoiceDate}
            customer={customer}
            items={invoiceItems}
            subtotal={subtotal}
            taxAmount={taxAmount}
            taxRate={taxRate}
            discount={discount}
            total={total}
            paymentMethod={paymentMethod}
            notes={invoiceNotes}
            bankDetails={bankDetails}
          />
        </div>
      </div>
    </div>
  );
}
