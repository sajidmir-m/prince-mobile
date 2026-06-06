"use client";

import { useState } from "react";
import { Search, FileText, ShoppingBag, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchImeiHistory } from "@/lib/imei";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ImeiHistory } from "@/types/database";
import QRCode from "react-qr-code";
import { getImeiQrData } from "@/lib/qr";

export function ImeiTracker({ initialImei }: { initialImei?: string }) {
  const [imei, setImei] = useState(initialImei || "");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ImeiHistory | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!imei.trim()) return;
    setLoading(true);
    setSearched(true);
    const result = await fetchImeiHistory(imei.trim());
    setHistory(result);
    setLoading(false);
  };

  const device = history?.device;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            IMEI Lifecycle Tracker
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete purchase-to-sale history for any device
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter IMEI 1 or IMEI 2..."
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="font-mono"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Searching..." : "Track"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searched && !history?.device && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No device found for IMEI: {imei}
          </CardContent>
        </Card>
      )}

      {device && history && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Device Information</CardTitle>
                <Badge variant="outline">
                  {history.deviceType === "new" ? "New Mobile" : "Second-Hand"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Info label="Brand" value={device.brand} />
              <Info label="Model" value={device.model} />
              <Info label="Color" value={device.color} />
              <Info label="RAM" value={device.ram} />
              <Info label="Storage" value={device.storage} />
              <Info label="IMEI 1" value={device.imei1} mono />
              {"imei2" in device && device.imei2 && (
                <Info label="IMEI 2" value={device.imei2} mono />
              )}
              {"status" in device && (
                <Info label="Status" value={device.status.replace("_", " ")} />
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center justify-center p-4">
            <p className="mb-2 text-sm font-medium">Device QR Code</p>
            <QRCode value={getImeiQrData(device.imei1, history.deviceType || "new")} size={140} />
          </Card>

          {history.purchase && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingBag className="h-4 w-4" />
                  Purchase Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Info label="Date" value={formatDate(history.purchase.date)} />
                <Info label="Supplier/Seller" value={history.purchase.supplier} />
                <Info label="Cost" value={formatCurrency(history.purchase.cost)} />
                {history.purchase.billUrl && (
                  <a
                    href={history.purchase.billUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" />
                    View Purchase Bill
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {history.sale ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Sale Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Info label="Customer" value={history.sale.customerName} />
                <Info label="Phone" value={history.sale.customerPhone} />
                <Info label="Invoice" value={history.sale.invoiceNumber} />
                <Info label="Sale Date" value={formatDate(history.sale.saleDate)} />
                <Info label="Sale Price" value={formatCurrency(history.sale.salePrice)} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                Not sold yet — device is in inventory
              </CardContent>
            </Card>
          )}

          {history.documents.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Documents</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {history.documents.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <FileText className="h-3 w-3" />
                    {doc.type}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${mono ? "font-mono text-sm" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
