"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function CustomerFormDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    gst_number: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("customers").insert(form).select().single();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await logAudit("CREATE", "customer", data.id, null, data);
    toast.success("Customer added");
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Customer</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(["name", "phone", "address", "email", "gst_number"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label className="capitalize">{key.replace("_", " ")}{key === "name" || key === "phone" ? " *" : ""}</Label>
              <Input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === "name" || key === "phone"}
              />
            </div>
          ))}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Customer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
