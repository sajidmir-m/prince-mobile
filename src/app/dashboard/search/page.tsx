"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState<{ type: string; title: string; subtitle: string; href: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    const run = async () => {
      setLoading(true);
      const supabase = createClient();
      const found: typeof results = [];

      const [{ data: mobiles }, { data: customers }, { data: sales }, { data: suppliers }] =
        await Promise.all([
          supabase
            .from("mobile_devices")
            .select("id, brand, model, imei1")
            .or(`imei1.ilike.%${q}%,imei2.ilike.%${q}%,model.ilike.%${q}%,brand.ilike.%${q}%`)
            .is("deleted_at", null)
            .limit(10),
          supabase
            .from("customers")
            .select("id, name, phone")
            .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
            .is("deleted_at", null)
            .limit(10),
          supabase
            .from("sales")
            .select("id, sale_number")
            .ilike("sale_number", `%${q}%`)
            .is("deleted_at", null)
            .limit(10),
          supabase
            .from("suppliers")
            .select("id, name, phone")
            .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
            .is("deleted_at", null)
            .limit(10),
        ]);

      mobiles?.forEach((m) =>
        found.push({
          type: "Mobile",
          title: `${m.brand} ${m.model}`,
          subtitle: m.imei1,
          href: `/dashboard/imei?q=${m.imei1}`,
        })
      );
      customers?.forEach((c) =>
        found.push({
          type: "Customer",
          title: c.name,
          subtitle: c.phone,
          href: "/dashboard/customers",
        })
      );
      sales?.forEach((s) =>
        found.push({
          type: "Sale",
          title: s.sale_number,
          subtitle: "Invoice/Sale",
          href: "/dashboard/sales",
        })
      );
      suppliers?.forEach((s) =>
        found.push({
          type: "Supplier",
          title: s.name,
          subtitle: s.phone || "",
          href: "/dashboard/suppliers",
        })
      );

      setResults(found);
      setLoading(false);
    };
    run();
  }, [q]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search Results</h1>
      {q ? (
        <p className="text-muted-foreground">
          Showing results for: <span className="font-mono font-medium">{q}</span>
          {loading && " (loading...)"}
        </p>
      ) : (
        <p className="text-muted-foreground">Use the search bar to find IMEI, customers, invoices...</p>
      )}
      <div className="grid gap-3">
        {results.map((r, i) => (
          <Link key={i} href={r.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="py-3">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">
                      <span className="text-xs text-muted-foreground mr-2">[{r.type}]</span>
                      {r.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{r.subtitle}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {q && !loading && results.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No results found</CardContent></Card>
        )}
      </div>
    </div>
  );
}
