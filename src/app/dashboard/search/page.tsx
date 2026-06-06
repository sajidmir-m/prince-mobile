"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  buildProductOrFilter,
  filterAndRankSearchResults,
  type SearchableFields,
} from "@/lib/search-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

type SearchResult = {
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

type SearchHit = SearchResult & {
  fields: SearchableFields;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    const run = async () => {
      setLoading(true);
      const supabase = createClient();
      const found: SearchHit[] = [];

      const [
        { data: mobiles },
        { data: shDevices },
        { data: accessories },
        { data: customers },
        { data: sales },
        { data: suppliers },
      ] = await Promise.all([
        supabase
          .from("mobile_devices")
          .select("id, brand, model, imei1")
          .or(buildProductOrFilter(q, { model: true, brand: true, imei: true }))
          .is("deleted_at", null)
          .limit(20),
        supabase
          .from("second_hand_devices")
          .select("id, brand, model, imei1, seller_name")
          .or(buildProductOrFilter(q, { model: true, brand: true, seller: true, imei: true }))
          .is("deleted_at", null)
          .limit(20),
        supabase
          .from("accessory_products")
          .select("id, name, sku")
          .or(buildProductOrFilter(q, { name: true, sku: true }))
          .is("deleted_at", null)
          .limit(20),
        supabase
          .from("customers")
          .select("id, name, phone")
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
          .is("deleted_at", null)
          .limit(20),
        supabase
          .from("sales")
          .select("id, sale_number")
          .ilike("sale_number", `%${q}%`)
          .is("deleted_at", null)
          .limit(20),
        supabase
          .from("suppliers")
          .select("id, name, phone")
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
          .is("deleted_at", null)
          .limit(20),
      ]);

      mobiles?.forEach((m) =>
        found.push({
          type: "Mobile",
          title: `${m.brand} ${m.model}`,
          subtitle: m.imei1,
          href: `/dashboard/imei?q=${m.imei1}`,
          fields: { brand: m.brand, model: m.model, imei: m.imei1 },
        })
      );
      shDevices?.forEach((d) =>
        found.push({
          type: "Second-Hand",
          title: `${d.brand} ${d.model}`,
          subtitle: `IMEI: ${d.imei1}`,
          href: `/dashboard/imei?q=${d.imei1}`,
          fields: { brand: d.brand, model: d.model, imei: d.imei1, seller_name: d.seller_name },
        })
      );
      accessories?.forEach((a) =>
        found.push({
          type: "Accessory",
          title: a.name,
          subtitle: a.sku ? `SKU: ${a.sku}` : "Accessory",
          href: "/dashboard/inventory/accessories",
          fields: { name: a.name, sku: a.sku || undefined },
        })
      );
      customers?.forEach((c) =>
        found.push({
          type: "Customer",
          title: c.name,
          subtitle: c.phone,
          href: "/dashboard/customers",
          fields: { name: c.name, phone: c.phone },
        })
      );
      sales?.forEach((s) =>
        found.push({
          type: "Sale",
          title: s.sale_number,
          subtitle: "Invoice/Sale",
          href: "/dashboard/sales",
          fields: { sale_number: s.sale_number },
        })
      );
      suppliers?.forEach((s) =>
        found.push({
          type: "Supplier",
          title: s.name,
          subtitle: s.phone || "",
          href: "/dashboard/suppliers",
          fields: { name: s.name, phone: s.phone || undefined },
        })
      );

      const ranked = filterAndRankSearchResults(q, found, (hit) => hit.fields).map((hit) => ({
        type: hit.type,
        title: hit.title,
        subtitle: hit.subtitle,
        href: hit.href,
      }));

      setResults(ranked.slice(0, 20));
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
