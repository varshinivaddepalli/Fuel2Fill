-- =====================================================
-- PETRO ASTRA V1 - CLIENT PHOTO COLUMN & STORAGE
-- =====================================================

-- Add client_photo column to clients table (optional, stores URL)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_photo TEXT;

-- Create storage bucket for client photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos',
  'client-photos',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to client-photos bucket
CREATE POLICY "Authenticated users can upload client photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-photos');

-- Allow authenticated users to read client photos
CREATE POLICY "Authenticated users can read client photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update client photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-photos');

-- Allow authenticated users to delete client photos
CREATE POLICY "Authenticated users can delete client photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-photos');

-- =====================================================
-- END OF MIGRATION
-- =====================================================
