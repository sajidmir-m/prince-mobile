"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { STORE } from "@/lib/store-config";
import { StoreLogo } from "@/components/store-logo";

const defaultSettings = () => ({
  id: "",
  store_name: STORE.name as string,
  store_address: STORE.address as string,
  store_phone: STORE.phone as string,
  store_email: STORE.email as string,
  gst_number: "",
  tax_rate: "0",
  logo_url: STORE.logo as string,
  invoice_prefix: "INV",
  bank_name: "",
  bank_account_title: "",
  bank_account_number: "",
  bank_branch: "",
  bank_iban: "",
});

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("store_settings").select("*").limit(1).single();
      if (data) {
        setSettings({
          id: data.id || "",
          store_name: data.store_name || STORE.name,
          store_address: data.store_address || STORE.address,
          store_phone: data.store_phone || STORE.phone,
          store_email: data.store_email || STORE.email,
          gst_number: data.gst_number || "",
          tax_rate: String(data.tax_rate ?? 0),
          logo_url: data.logo_url || STORE.logo,
          invoice_prefix: data.invoice_prefix || "INV",
          bank_name: data.bank_name || "",
          bank_account_title: data.bank_account_title || "",
          bank_account_number: data.bank_account_number || "",
          bank_branch: data.bank_branch || "",
          bank_iban: data.bank_iban || "",
        });
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    let logoUrl = settings.logo_url;
    if (logoFile) {
      const url = await uploadFile("store-assets", logoFile, "logo");
      if (url) logoUrl = url;
    }

    const { error } = await supabase
      .from("store_settings")
      .update({
        store_name: settings.store_name,
        store_address: settings.store_address,
        store_phone: settings.store_phone,
        store_email: settings.store_email,
        gst_number: settings.gst_number,
        tax_rate: parseFloat(settings.tax_rate) || 0,
        logo_url: logoUrl,
        invoice_prefix: settings.invoice_prefix,
        bank_name: settings.bank_name.trim() || null,
        bank_account_title: settings.bank_account_title.trim() || null,
        bank_account_number: settings.bank_account_number.trim() || null,
        bank_branch: settings.bank_branch.trim() || null,
        bank_iban: settings.bank_iban.trim() || null,
      })
      .eq("id", settings.id);

    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Store Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invoice & Store Details</CardTitle>
          <CardDescription>Shown at the top of every customer invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Store Name</Label>
                <Input
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={settings.store_address}
                  onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={settings.store_phone}
                    onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={settings.store_email}
                    onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    value={settings.gst_number}
                    onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    value={settings.tax_rate}
                    onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Store Logo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                {(settings.logo_url || STORE.logo) && (
                  <StoreLogo
                    src={settings.logo_url || STORE.logo}
                    className="h-16 w-auto rounded border bg-black p-1"
                    size={64}
                  />
                )}
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div>
                <h3 className="font-semibold">Bank Details</h3>
                <p className="text-sm text-muted-foreground">
                  Printed at the bottom of invoices for customer payments
                </p>
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  placeholder="e.g. J&K Bank"
                  value={settings.bank_name}
                  onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Title</Label>
                <Input
                  placeholder="e.g. Prince Mobile Store"
                  value={settings.bank_account_title}
                  onChange={(e) => setSettings({ ...settings, bank_account_title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="0000000000000"
                    value={settings.bank_account_number}
                    onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    placeholder="e.g. Khanyar Branch"
                    value={settings.bank_branch}
                    onChange={(e) => setSettings({ ...settings, bank_branch: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>IBAN (optional)</Label>
                <Input
                  placeholder="PK00XXXX0000000000000000"
                  value={settings.bank_iban}
                  onChange={(e) => setSettings({ ...settings, bank_iban: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
