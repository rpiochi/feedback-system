-- =============================================
-- Storage Policies para bug-screenshots
-- Execute no SQL Editor do Supabase
-- =============================================

-- Permitir upload anônimo (qualquer um pode enviar screenshots)
CREATE POLICY "Público pode fazer upload de screenshots"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'bug-screenshots');

-- Apenas admin pode visualizar screenshots
CREATE POLICY "Admin pode visualizar screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bug-screenshots'
  AND is_platform_admin()
);

-- Admin pode deletar screenshots
CREATE POLICY "Admin pode deletar screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bug-screenshots'
  AND is_platform_admin()
);
