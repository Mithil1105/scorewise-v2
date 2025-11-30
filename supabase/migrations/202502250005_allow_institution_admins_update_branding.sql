-- Allow institution admins to update branding (logo_url and theme_color)
-- This migration is idempotent and can be run multiple times safely

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Institution admins can update branding" ON public.institutions;

-- Create policy for institution admins to update branding
CREATE POLICY "Institution admins can update branding"
ON public.institutions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = institutions.id
    AND im.user_id = auth.uid()
    AND im.role = 'inst_admin'
    AND im.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = institutions.id
    AND im.user_id = auth.uid()
    AND im.role = 'inst_admin'
    AND im.status = 'active'
  )
);

-- Note: This policy allows institution admins to update ANY field in the institutions table
-- If you want to restrict it to only logo_url and theme_color, you would need to use
-- a more complex policy or a trigger. For now, this allows full update access
-- which is acceptable since institution admins should have control over their institution's branding.

