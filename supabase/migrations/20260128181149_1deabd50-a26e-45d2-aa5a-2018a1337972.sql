-- Create storage bucket for temporary video reference images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('video-references', 'video-references', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload reference images
CREATE POLICY "Authenticated users can upload video references"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-references');

-- Allow public read access for KIE.AI to fetch images
CREATE POLICY "Public read access for video references"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-references');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own video references"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'video-references' AND auth.uid()::text = (storage.foldername(name))[1]);