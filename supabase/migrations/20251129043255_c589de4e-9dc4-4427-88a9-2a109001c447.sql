-- Drop the existing policy that allows any authenticated user to create institutions
DROP POLICY IF EXISTS "Authenticated users can create institutions" ON public.institutions;

-- Create new policy that only allows platform admins to create institutions
CREATE POLICY "Only platform admins can create institutions"
ON public.institutions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);