"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RowActions } from "@/components/crud/row-actions";
import { DetailDialog } from "@/components/crud/detail-dialog";
import { formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Category } from "@/types/database";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [viewCat, setViewCat] = useState<Category | null>(null);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("categories").select("*").is("deleted_at", null).order("name");
    setCategories((data as Category[]) || []);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("categories").insert({ name });
    if (error) toast.error(error.message);
    else { toast.success("Category created"); setName(""); setOpen(false); load(); }
  };

  const softDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) { toast.error("Cannot delete system category"); return; }
    const supabase = createClient();
    await supabase.from("categories").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    toast.success("Category removed");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Unlimited custom categories</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Category</Button>
          <DialogContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  {c.is_system ? <Badge variant="secondary">System</Badge> : <Badge>Custom</Badge>}
                </TableCell>
                <TableCell>
                  <RowActions
                    onView={() => setViewCat(c)}
                    onDelete={!c.is_system ? () => softDelete(c.id, c.is_system) : undefined}
                    hideEdit
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailDialog
        open={!!viewCat}
        onOpenChange={(o) => !o && setViewCat(null)}
        title={viewCat?.name || "Category"}
        fields={
          viewCat
            ? [
                { label: "Name", value: viewCat.name },
                { label: "Type", value: viewCat.is_system ? "System" : "Custom" },
                { label: "Description", value: viewCat.description, fullWidth: true },
                { label: "Created", value: formatDate(viewCat.created_at) },
              ]
            : undefined
        }
      />
    </div>
  );
}
