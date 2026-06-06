import { createClient } from "@/lib/supabase/client";

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string | null,
  oldData?: Record<string, unknown> | object | null,
  newData?: Record<string, unknown> | object | null
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_logs").insert({
    user_id: user?.id,
    user_email: user?.email,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  });
}
