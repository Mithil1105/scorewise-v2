-- Add image_url column to assignments table for storing assignment images
-- This is useful for IELTS Task 1 assignments that require charts/graphs/images
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for assignment images
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment_images', 'assignment_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assignment_images bucket
-- Teachers and institution admins can upload assignment images
CREATE POLICY "Teachers and admins can upload assignment images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assignment_images' 
  AND EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.user_id = auth.uid()
    AND im.status = 'active'
    AND im.role IN ('teacher', 'inst_admin')
  )
);

-- Institution members can view assignment images
CREATE POLICY "Institution members can view assignment images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assignment_images'
  AND (
    -- Public read access for assignment images
    true
    OR EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.user_id = auth.uid()
      AND im.status = 'active'
    )
  )
);

-- Teachers and admins can update their own uploaded images
CREATE POLICY "Teachers and admins can update assignment images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'assignment_images'
  AND EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.user_id = auth.uid()
    AND im.status = 'active'
    AND im.role IN ('teacher', 'inst_admin')
  )
);

-- Teachers and admins can delete assignment images
CREATE POLICY "Teachers and admins can delete assignment images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assignment_images'
  AND EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.user_id = auth.uid()
    AND im.status = 'active'
    AND im.role IN ('teacher', 'inst_admin')
  )
);

-- Platform admins have full access
CREATE POLICY "Platform admins can manage assignment images"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'assignment_images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

