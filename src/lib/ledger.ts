import { createClient } from "@/lib/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

export type LedgerEntryType = "sale" | "expense" | "purchase";

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
  date: string;
  reference: string;
  description: string;
  category?: string;
  amount: number;
  purchaseCost?: number;
  profit?: number;
  paymentMethod?: string | null;
}

export interface LedgerSummary {
  totalSales: number;
  totalPurchaseCost: number;
  grossProfit: number;
  totalExpenses: number;
  totalStockPurchases: number;
  netProfit: number;
  saleCount: number;
  expenseCount: number;
}

const EXPENSE_LABELS: Record<string, string> = {
  salary: "Salary",
  rent: "Rent",
  utilities: "Utilities",
  marketing: "Marketing",
  repair: "Repair",
  transport: "Transport",
  other: "Other",
};

export function expenseCategoryLabel(cat: string) {
  return EXPENSE_LABELS[cat] || cat;
}

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_LABELS) as Array<
  keyof typeof EXPENSE_LABELS
>;

export async function fetchLedger(
  fromDate?: string,
  toDate?: string
): Promise<{ entries: LedgerEntry[]; summary: LedgerSummary }> {
  const supabase = createClient();

  const from = fromDate || format(startOfMonth(new Date()), "yyyy-MM-dd");
  const to = toDate || format(endOfMonth(new Date()), "yyyy-MM-dd");
  const toEnd = `${to}T23:59:59`;

  const [{ data: sales }, { data: expenses }, { data: purchases }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        `id, sale_number, sale_date, total_amount, payment_method,
         sale_items(description, quantity, unit_price, total_price, purchase_unit_cost, profit)`
      )
      .is("deleted_at", null)
      .gte("sale_date", from)
      .lte("sale_date", toEnd)
      .order("sale_date", { ascending: false }),
    supabase
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .gte("expense_date", from)
      .lte("expense_date", to)
      .order("expense_date", { ascending: false }),
    supabase
      .from("purchases")
      .select("id, purchase_number, purchase_date, total_amount, seller_name, suppliers(name), payment_status")
      .is("deleted_at", null)
      .gte("purchase_date", from)
      .lte("purchase_date", to)
      .order("purchase_date", { ascending: false }),
  ]);

  const entries: LedgerEntry[] = [];

  let totalSales = 0;
  let totalPurchaseCost = 0;
  let grossProfit = 0;

  sales?.forEach((sale) => {
    const items = sale.sale_items as {
      description: string;
      quantity: number;
      total_price: number;
      purchase_unit_cost?: number;
      profit?: number;
    }[] | null;

    const itemCost =
      items?.reduce(
        (s, i) => s + Number(i.purchase_unit_cost || 0) * i.quantity,
        0
      ) ?? 0;
    const itemProfit =
      items?.reduce((s, i) => s + Number(i.profit ?? 0), 0) ??
      Number(sale.total_amount) - itemCost;

    totalSales += Number(sale.total_amount);
    totalPurchaseCost += itemCost;
    grossProfit += itemProfit;

    const itemSummary = items?.length
      ? items.map((i) => i.description).join(", ").substring(0, 80)
      : "Sale";

    entries.push({
      id: sale.id,
      type: "sale",
      date: sale.sale_date,
      reference: sale.sale_number,
      description: itemSummary,
      amount: Number(sale.total_amount),
      purchaseCost: itemCost,
      profit: itemProfit,
      paymentMethod: sale.payment_method,
    });
  });

  let totalExpenses = 0;
  expenses?.forEach((exp) => {
    totalExpenses += Number(exp.amount);
    entries.push({
      id: exp.id,
      type: "expense",
      date: exp.expense_date,
      reference: `EXP-${exp.id.slice(0, 8).toUpperCase()}`,
      description: exp.title,
      category: expenseCategoryLabel(exp.category),
      amount: Number(exp.amount),
      paymentMethod: exp.payment_method,
    });
  });

  let totalStockPurchases = 0;
  purchases?.forEach((p) => {
    totalStockPurchases += Number(p.total_amount);
    entries.push({
      id: p.id,
      type: "purchase",
      date: p.purchase_date,
      reference: p.purchase_number,
      description: `Stock: ${(p.suppliers as { name?: string } | null)?.name || p.seller_name || "Supplier"}`,
      category: "Inventory Purchase",
      amount: Number(p.total_amount),
      paymentMethod: p.payment_status,
    });
  });

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    entries,
    summary: {
      totalSales,
      totalPurchaseCost,
      grossProfit,
      totalExpenses,
      totalStockPurchases,
      netProfit: grossProfit - totalExpenses,
      saleCount: sales?.length ?? 0,
      expenseCount: expenses?.length ?? 0,
    },
  };
}
