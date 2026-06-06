"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { softDeleteRecord } from "@/lib/purchase-sync";
import { logAudit } from "@/lib/audit";
import {
  fetchLedger,
  expenseCategoryLabel,
  EXPENSE_CATEGORIES,
  type LedgerEntry,
  type LedgerSummary,
} from "@/lib/ledger";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Package,
} from "lucide-react";
import { toast } from "sonner";

const emptyExpense = {
  title: "",
  category: "salary",
  amount: "",
  expense_date: new Date().toISOString().split("T")[0],
  payment_method: "cash",
  notes: "",
};

export function LedgerPage() {
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sale" | "expense" | "purchase">("all");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [viewEntry, setViewEntry] = useState<LedgerEntry | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchLedger(from, to);
    setEntries(data.entries);
    setSummary(data.summary);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const filtered = entries.filter((e) => filter === "all" || e.type === filter);

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) {
      toast.error("Title and amount required");
      return;
    }
    const supabase = createClient();
    const payload = {
      title: expenseForm.title,
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      expense_date: expenseForm.expense_date,
      payment_method: expenseForm.payment_method,
      notes: expenseForm.notes || null,
    };

    if (editExpenseId) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editExpenseId);
      if (error) toast.error(error.message);
      else {
        toast.success("Expense updated");
        setExpenseOpen(false);
        load();
      }
    } else {
      const { data, error } = await supabase.from("expenses").insert(payload).select().single();
      if (error) toast.error(error.message);
      else {
        await logAudit("CREATE", "expense", data.id, null, data);
        toast.success("Expense added to ledger");
        setExpenseOpen(false);
        setExpenseForm(emptyExpense);
        load();
      }
    }
  };

  const openEditExpense = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("expenses").select("*").eq("id", id).single();
    if (data) {
      setEditExpenseId(id);
      setExpenseForm({
        title: data.title,
        category: data.category,
        amount: String(data.amount),
        expense_date: data.expense_date,
        payment_method: data.payment_method || "cash",
        notes: data.notes || "",
      });
      setExpenseOpen(true);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Remove this expense?")) return;
    try {
      await softDeleteRecord("expenses", id, "expense");
      toast.success("Expense removed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const typeIcon = (type: LedgerEntry["type"]) => {
    if (type === "sale") return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    if (type === "expense") return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
    return <Package className="h-4 w-4 text-orange-600" />;
  };

  const typeBadge = (type: LedgerEntry["type"]) => {
    const map = {
      sale: { label: "Sale", variant: "default" as const },
      expense: { label: "Expense", variant: "destructive" as const },
      purchase: { label: "Stock Purchase", variant: "secondary" as const },
    };
    const m = map[type];
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Ledger</h1>
          <p className="text-muted-foreground">
            Sales profit, expenses (salary, rent), and net profit
          </p>
        </div>
        <Button
          onClick={() => {
            setEditExpenseId(null);
            setExpenseForm(emptyExpense);
            setExpenseOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          Apply
        </Button>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entries</SelectItem>
            <SelectItem value="sale">Sales only</SelectItem>
            <SelectItem value="expense">Expenses only</SelectItem>
            <SelectItem value="purchase">Purchases only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3 w-3" /> Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalSales)}</p>
              <p className="text-xs text-muted-foreground">{summary.saleCount} sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Cost (Purchase Price)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{formatCurrency(summary.totalPurchaseCost)}</p>
              <p className="text-xs text-muted-foreground">Sold items cost</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Gross Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-700">{formatCurrency(summary.grossProfit)}</p>
              <p className="text-xs text-muted-foreground">Selling − Purchase</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">{summary.expenseCount} entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Stock Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(summary.totalStockPurchases)}</p>
              <p className="text-xs text-muted-foreground">Inventory bought</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-xl font-bold ${summary.netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                {formatCurrency(summary.netProfit)}
              </p>
              <p className="text-xs text-muted-foreground">Gross − Expenses</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <p className="text-sm text-muted-foreground">
            Green = sales income & profit · Red = business expenses · Orange = stock purchases
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading ledger...</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Sale Amount</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit / Out</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={`${entry.type}-${entry.id}`}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {entry.type === "sale"
                          ? formatDateTime(entry.date)
                          : formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcon(entry.type)}
                          {typeBadge(entry.type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.type === "sale" ? (
                          <span className="text-green-700">+{formatCurrency(entry.amount)}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {entry.type === "sale" && entry.purchaseCost !== undefined
                          ? formatCurrency(entry.purchaseCost)
                          : entry.type !== "sale"
                            ? formatCurrency(entry.amount)
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {entry.type === "sale" ? (
                          <span className={entry.profit! >= 0 ? "text-green-700" : "text-red-600"}>
                            +{formatCurrency(entry.profit ?? 0)}
                          </span>
                        ) : (
                          <span className="text-red-600">−{formatCurrency(entry.amount)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          onView={() => setViewEntry(entry)}
                          onEdit={
                            entry.type === "expense"
                              ? () => openEditExpense(entry.id)
                              : undefined
                          }
                          onDelete={
                            entry.type === "expense"
                              ? () => deleteExpense(entry.id)
                              : undefined
                          }
                          hideEdit={entry.type !== "expense"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No ledger entries in this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editExpenseId ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Staff Salary - March"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v ?? "other" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {expenseCategoryLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (Rs.) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment</Label>
                <Select
                  value={expenseForm.payment_method}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, payment_method: v ?? "cash" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">
              {editExpenseId ? "Update Expense" : "Add to Ledger"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <DetailDialog
        open={!!viewEntry}
        onOpenChange={(o) => !o && setViewEntry(null)}
        title={viewEntry?.reference || "Entry"}
        subtitle={viewEntry?.type}
        sections={
          viewEntry
            ? [
                {
                  title: "Details",
                  fields: [
                    { label: "Type", value: viewEntry.type },
                    { label: "Date", value: viewEntry.type === "sale" ? formatDateTime(viewEntry.date) : formatDate(viewEntry.date) },
                    { label: "Description", value: viewEntry.description, fullWidth: true },
                    { label: "Category", value: viewEntry.category },
                    { label: "Payment", value: viewEntry.paymentMethod },
                  ],
                },
                ...(viewEntry.type === "sale"
                  ? [
                      {
                        title: "Profit Breakdown",
                        fields: [
                          { label: "Sale Amount (Selling Price)", value: formatCurrency(viewEntry.amount) },
                          { label: "Purchase Cost", value: formatCurrency(viewEntry.purchaseCost ?? 0) },
                          { label: "Profit", value: formatCurrency(viewEntry.profit ?? 0) },
                        ],
                      },
                    ]
                  : [
                      {
                        title: "Amount",
                        fields: [{ label: "Paid Out", value: formatCurrency(viewEntry.amount) }],
                      },
                    ]),
              ]
            : undefined
        }
      />
    </div>
  );
}
