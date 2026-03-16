-- Fix: sake-images storage bucket RLS policies
-- Run this in your Supabase SQL Editor at https://supabase.com/dashboard

-- First, ensure the bucket exists (run this if it doesn't exist yet)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sake-images', 'sake-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access
CREATE POLICY "Public can read sake images"
ON storage.objects FOR SELECT
USING (bucket_id = 'sake-images');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload sake images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sake-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anonymous uploads to the anonymous folder
CREATE POLICY "Anonymous users can upload sake images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sake-images'
  AND (storage.foldername(name))[1] = 'anonymous'
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete their own sake images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'sake-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
