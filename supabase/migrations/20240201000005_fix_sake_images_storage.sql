-- B03: Fix sake images storage - make bucket public and add RLS
INSERT INTO storage.buckets (id, name, public)
VALUES ('sake-images', 'sake-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Also ensure avatars bucket is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can read sake images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload sake images" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload sake images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own sake images" ON storage.objects;

CREATE POLICY "Public can read sake images" ON storage.objects FOR SELECT USING (bucket_id = 'sake-images');
CREATE POLICY "Authenticated users can upload sake images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sake-images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anonymous users can upload sake images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sake-images' AND (storage.foldername(name))[1] = 'anonymous');
CREATE POLICY "Authenticated users can delete their own sake images" ON storage.objects FOR DELETE
USING (bucket_id = 'sake-images' AND auth.uid()::text = (storage.foldername(name))[1]);
