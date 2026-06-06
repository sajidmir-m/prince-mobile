import { createClient } from "@/lib/supabase/server";
import { MobileForm } from "@/components/inventory/mobile-form";

export default async function NewMobilePage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add New Mobile</h1>
      <MobileForm suppliers={suppliers || []} />
    </div>
  );
}
