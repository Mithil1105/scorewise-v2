-- Make policies idempotent by dropping and recreating them
-- This migration ensures policies can be safely rerun

-- Drop and recreate institution policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view active institutions" ON public.institutions;
    DROP POLICY IF EXISTS "Platform admins can manage all institutions" ON public.institutions;
    DROP POLICY IF EXISTS "Owners can update their institution" ON public.institutions;
    DROP POLICY IF EXISTS "Authenticated users can create institutions" ON public.institutions;
END $$;

CREATE POLICY IF NOT EXISTS "Anyone can view active institutions"
ON public.institutions FOR SELECT
USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Platform admins can manage all institutions"
ON public.institutions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Owners can update their institution"
ON public.institutions FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY IF NOT EXISTS "Authenticated users can create institutions"
ON public.institutions FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- Drop and recreate institution_members policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own memberships" ON public.institution_members;
    DROP POLICY IF EXISTS "Institution admins can view all members" ON public.institution_members;
    DROP POLICY IF EXISTS "Institution admins can manage members" ON public.institution_members;
    DROP POLICY IF EXISTS "Users can request to join institutions" ON public.institution_members;
    DROP POLICY IF EXISTS "Platform admins can manage all members" ON public.institution_members;
    DROP POLICY IF EXISTS "Teachers can view institution members" ON public.institution_members;
END $$;

CREATE POLICY IF NOT EXISTS "Users can view their own memberships"
ON public.institution_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Institution admins can view all members"
ON public.institution_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = institution_members.institution_id
    AND im.user_id = auth.uid()
    AND im.role = 'inst_admin'
    AND im.status = 'active'
  )
);

CREATE POLICY IF NOT EXISTS "Institution admins can manage members"
ON public.institution_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = institution_members.institution_id
    AND im.user_id = auth.uid()
    AND im.role = 'inst_admin'
    AND im.status = 'active'
  )
);

CREATE POLICY IF NOT EXISTS "Users can request to join institutions"
ON public.institution_members FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY IF NOT EXISTS "Platform admins can manage all members"
ON public.institution_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY IF NOT EXISTS "Teachers can view institution members"
ON public.institution_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = institution_members.institution_id
    AND im.user_id = auth.uid()
    AND im.role IN ('teacher', 'inst_admin')
    AND im.status = 'active'
  )
);

-- Ensure institution columns exist on essays table
ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS institution_member_id uuid REFERENCES public.institution_members(id) ON DELETE SET NULL;

-- Drop and recreate essays policy for institutions
DO $$
BEGIN
    DROP POLICY IF EXISTS "Institution members can view institution essays" ON public.essays;
END $$;

CREATE POLICY IF NOT EXISTS "Institution members can view institution essays"
ON public.essays FOR SELECT
USING (
  institution_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = essays.institution_id
    AND im.user_id = auth.uid()
    AND im.status = 'active'
    AND (im.role IN ('teacher', 'inst_admin') OR im.user_id = essays.user_id)
  )
);

