"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from "date-fns";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const [period, setPeriod] = useState("monthly");
  const [salesTotal, setSalesTotal] = useState(0);
  const [purchaseTotal, setPurchaseTotal] = useState(0);
  const [profit, setProfit] = useState(0);
  const [mobileCount, setMobileCount] = useState({ sold: 0, stock: 0 });
  const [loading, setLoading] = useState(false);

  const getStartDate = () => {
    const now = new Date();
    switch (period) {
      case "daily": return startOfDay(now).toISOString();
      case "weekly": return startOfWeek(now).toISOString();
      case "yearly": return startOfYear(now).toISOString();
      default: return startOfMonth(now).toISOString();
    }
  };

  const loadReport = async () => {
    setLoading(true);
    const supabase = createClient();
    const from = getStartDate();

    const [{ data: sales }, { data: purchases }, { data: mobiles }] = await Promise.all([
      supabase.from("sales").select("total_amount").gte("sale_date", from).is("deleted_at", null),
      supabase.from("purchases").select("total_amount").gte("purchase_date", from.split("T")[0]).is("deleted_at", null),
      supabase.from("mobile_devices").select("status, purchase_price, selling_price").is("deleted_at", null),
    ]);

    const sTotal = sales?.reduce((a, x) => a + Number(x.total_amount), 0) ?? 0;
    const pTotal = purchases?.reduce((a, x) => a + Number(x.total_amount), 0) ?? 0;

    setSalesTotal(sTotal);
    setPurchaseTotal(pTotal);
    setProfit(sTotal - pTotal);
    setMobileCount({
      sold: mobiles?.filter((m) => m.status === "sold").length ?? 0,
      stock: mobiles?.filter((m) => m.status !== "sold").length ?? 0,
    });
    setLoading(false);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["Report Period", period],
      ["Sales Total", salesTotal],
      ["Purchase Total", purchaseTotal],
      ["Profit/Loss", profit],
      ["Sold Mobiles", mobileCount.sold],
      ["In Stock Mobiles", mobileCount.stock],
      ["Generated", formatDate(new Date())],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report-${period}-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Sales, purchases, profit/loss, inventory & IMEI reports</p>
      </div>

      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
        <TabsContent value={period} className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={loadReport} disabled={loading}>
              {loading ? "Loading..." : "Generate Report"}
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">Sales Report</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(salesTotal)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Purchase Report</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(purchaseTotal)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Profit / Loss</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(profit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">IMEI / Mobile Report</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">Sold: {mobileCount.sold} · In Stock: {mobileCount.stock}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Inventory Value</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View dashboard for live inventory value</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
