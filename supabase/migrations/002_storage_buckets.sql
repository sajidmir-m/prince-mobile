-- Storage buckets and policies (safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('purchase-bills', 'purchase-bills', false, 10485760, ARRAY['image/jpeg','image/png','application/pdf']),
  ('second-hand-docs', 'second-hand-docs', false, 10485760, ARRAY['image/jpeg','image/png','application/pdf']),
  ('store-assets', 'store-assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auth upload documents" ON storage.objects;
CREATE POLICY "Auth upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('documents', 'purchase-bills', 'second-hand-docs', 'store-assets'));

DROP POLICY IF EXISTS "Auth read documents" ON storage.objects;
CREATE POLICY "Auth read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('documents', 'purchase-bills', 'second-hand-docs', 'store-assets'));

DROP POLICY IF EXISTS "Auth update own uploads" ON storage.objects;
CREATE POLICY "Auth update own uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('documents', 'purchase-bills', 'second-hand-docs', 'store-assets'));

DROP POLICY IF EXISTS "Public read store assets" ON storage.objects;
CREATE POLICY "Public read store assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'store-assets');
