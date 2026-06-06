import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Smartphone,
  CheckCircle,
} from "lucide-react";

interface StatsCardsProps {
  totalSales: number;
  todaySales: number;
  monthlyRevenue: number;
  inventoryValue: number;
  lowStockCount: number;
  soldMobiles: number;
  unsoldMobiles: number;
}

export function StatsCards(props: StatsCardsProps) {
  const cards = [
    { title: "Total Sales", value: formatCurrency(props.totalSales), icon: DollarSign },
    { title: "Today's Sales", value: formatCurrency(props.todaySales), icon: TrendingUp },
    { title: "Monthly Revenue", value: formatCurrency(props.monthlyRevenue), icon: TrendingUp },
    { title: "Inventory Value", value: formatCurrency(props.inventoryValue), icon: Package },
    { title: "Low Stock Items", value: props.lowStockCount.toString(), icon: AlertTriangle },
    { title: "Sold Mobiles", value: props.soldMobiles.toString(), icon: CheckCircle },
    { title: "Unsold Mobiles", value: props.unsoldMobiles.toString(), icon: Smartphone },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
