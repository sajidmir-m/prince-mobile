import { createClient } from "@/lib/supabase/server";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { startOfDay, startOfMonth } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = startOfDay(new Date()).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: allSales } = await supabase
    .from("sales")
    .select("total_amount, sale_date")
    .is("deleted_at", null);

  const totalSales =
    allSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  const todaySales =
    allSales
      ?.filter((s) => s.sale_date >= today)
      .reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  const monthlyRevenue =
    allSales
      ?.filter((s) => s.sale_date >= monthStart)
      .reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  const { data: mobiles } = await supabase
    .from("mobile_devices")
    .select("purchase_price, selling_price, status")
    .is("deleted_at", null);

  const { data: accessories } = await supabase
    .from("accessory_products")
    .select("purchase_price, quantity, stock_status")
    .is("deleted_at", null);

  const mobileValue =
    mobiles
      ?.filter((m) => m.status === "in_stock" || m.status === "reserved")
      .reduce((sum, m) => sum + Number(m.purchase_price), 0) ?? 0;

  const accessoryValue =
    accessories?.reduce(
      (sum, a) => sum + Number(a.purchase_price) * a.quantity,
      0
    ) ?? 0;

  const lowStockCount =
    accessories?.filter(
      (a) =>
        a.stock_status === "low_stock" ||
        a.stock_status === "out_of_stock" ||
        a.quantity <= 5
    ).length ?? 0;

  const soldMobiles = mobiles?.filter((m) => m.status === "sold").length ?? 0;
  const unsoldMobiles =
    mobiles?.filter((m) => m.status === "in_stock" || m.status === "reserved")
      .length ?? 0;

  const { data: recentSales } = await supabase
    .from("sales")
    .select("id, sale_number, total_amount, sale_date, customers(name)")
    .is("deleted_at", null)
    .order("sale_date", { ascending: false })
    .limit(8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of sales, inventory, and store performance
        </p>
      </div>

      <StatsCards
        totalSales={totalSales}
        todaySales={todaySales}
        monthlyRevenue={monthlyRevenue}
        inventoryValue={mobileValue + accessoryValue}
        lowStockCount={lowStockCount}
        soldMobiles={soldMobiles}
        unsoldMobiles={unsoldMobiles}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales && recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{sale.sale_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {(sale.customers as { name?: string } | null)?.name ||
                        "Walk-in"}{" "}
                      · {formatDateTime(sale.sale_date)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(Number(sale.total_amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sales yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
