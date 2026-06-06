"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { STORE } from "@/lib/store-config";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    id: "",
    store_name: STORE.name as string,
    store_address: "",
    store_phone: STORE.phone as string,
    store_email: STORE.email as string,
    gst_number: "",
    tax_rate: "0",
    logo_url: "",
    invoice_prefix: "INV",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("store_settings").select("*").limit(1).single();
      if (data) {
        setSettings({
          ...data,
          tax_rate: String(data.tax_rate ?? 0),
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
      })
      .eq("id", settings.id);

    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Store Settings</h1>
      <Card>
        <CardHeader><CardTitle>Invoice & Store Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input value={settings.store_name} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={settings.store_address} onChange={(e) => setSettings({ ...settings, store_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={settings.store_phone} onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={settings.store_email} onChange={(e) => setSettings({ ...settings, store_email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input value={settings.gst_number} onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input type="number" value={settings.tax_rate} onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Store Logo</Label>
              <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded border" />
              )}
            </div>
            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
