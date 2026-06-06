import { createClient } from "@/lib/supabase/client";

export async function uploadFile(
  bucket: "documents" | "purchase-bills" | "second-hand-docs" | "store-assets",
  file: File,
  folder: string
): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) {
    console.error("Upload error:", error);
    return null;
  }

  if (bucket === "store-assets") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  return signed?.signedUrl ?? path;
}
