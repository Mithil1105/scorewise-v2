-- Allow institutional admins and teachers to view profiles of members in their institution
-- This fixes the 403 error when trying to fetch member profiles

CREATE POLICY "Institutional admins can view member profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im1
    WHERE im1.user_id = auth.uid()
    AND im1.role = 'inst_admin'
    AND im1.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.institution_members im2
      WHERE im2.institution_id = im1.institution_id
      AND im2.user_id = profiles.user_id
    )
  )
);

CREATE POLICY "Teachers can view member profiles in their institution"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im1
    WHERE im1.user_id = auth.uid()
    AND im1.role IN ('teacher', 'inst_admin')
    AND im1.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.institution_members im2
      WHERE im2.institution_id = im1.institution_id
      AND im2.user_id = profiles.user_id
    )
  )
);

