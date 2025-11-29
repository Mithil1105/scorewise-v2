-- Create institutions table
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  owner_user_id uuid NOT NULL,
  logo_url text,
  theme_color text,
  plan text DEFAULT 'free',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create institution_members table
CREATE TABLE public.institution_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'teacher', 'inst_admin')),
  status text DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'blocked')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (institution_id, user_id)
);

-- Add institution columns to essays table
ALTER TABLE public.essays 
ADD COLUMN institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
ADD COLUMN institution_member_id uuid REFERENCES public.institution_members(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

-- Institutions RLS policies
CREATE POLICY "Anyone can view active institutions"
ON public.institutions FOR SELECT
USING (is_active = true);

CREATE POLICY "Platform admins can manage all institutions"
ON public.institutions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can update their institution"
ON public.institutions FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Authenticated users can create institutions"
ON public.institutions FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- Institution members RLS policies
CREATE POLICY "Users can view their own memberships"
ON public.institution_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Institution admins can view all members"
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

CREATE POLICY "Institution admins can manage members"
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

CREATE POLICY "Users can request to join institutions"
ON public.institution_members FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Platform admins can manage all members"
ON public.institution_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view students in their institution
CREATE POLICY "Teachers can view institution members"
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

-- Update essays RLS for institution scoping
CREATE POLICY "Institution members can view institution essays"
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

-- Trigger for updated_at
CREATE TRIGGER update_institutions_updated_at
BEFORE UPDATE ON public.institutions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();