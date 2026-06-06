import { createClient } from "@/lib/supabase/server";
import { SecondHandForm } from "@/components/inventory/second-hand-form";

export default async function NewSecondHandPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add Second-Hand Mobile</h1>
      <SecondHandForm suppliers={suppliers || []} />
    </div>
  );
}
