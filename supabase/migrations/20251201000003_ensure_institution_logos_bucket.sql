-- Ensure institution_logos storage bucket exists
-- This migration is idempotent and can be run multiple times safely

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'institution_logos', 
  'institution_logos', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist (idempotent)
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Institution admins can upload logos" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view institution logos" ON storage.objects;
    DROP POLICY IF EXISTS "Institution admins can update logos" ON storage.objects;
    DROP POLICY IF EXISTS "Institution admins can delete logos" ON storage.objects;
    DROP POLICY IF EXISTS "Platform admins can manage institution logos" ON storage.objects;
END $$;

-- Institution admins can upload logos
CREATE POLICY "Institution admins can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'institution_logos' 
  AND EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.user_id = auth.uid()
    AND im.status = 'active'
    AND im.role = 'inst_admin'
  )
);

-- Anyone can view institution logos (public bucket)
CREATE POLICY "Anyone can view institution logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'institution_logos');

-- Institution admins can update their own uploaded logos
CREATE POLICY "Institution admins can update logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'institution_logos'
  AND EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.user_id = auth.uid()
    AND im.status = 'active'
    AND im.role = 'inst_admin'
  )
);

-- Institution admins can delete logos
CREATE POLICY "Institution admins can delete logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'institution_logos'
  AND EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.user_id = auth.uid()
    AND im.status = 'active'
    AND im.role = 'inst_admin'
  )
);

-- Platform admins have full access
CREATE POLICY "Platform admins can manage institution logos"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'institution_logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

