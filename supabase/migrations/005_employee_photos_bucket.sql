-- =====================================================
-- PETRO ASTRA V1 - EMPLOYEE PHOTOS STORAGE BUCKET
-- =====================================================

-- Create storage bucket for employee photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-photos',
  'employee-photos',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to employee-photos bucket
CREATE POLICY "Authenticated users can upload employee photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employee-photos');

-- Allow authenticated users to read employee photos
CREATE POLICY "Authenticated users can read employee photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'employee-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update employee photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'employee-photos');

-- Allow authenticated users to delete employee photos
CREATE POLICY "Authenticated users can delete employee photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'employee-photos');

-- =====================================================
-- END OF MIGRATION
-- =====================================================
