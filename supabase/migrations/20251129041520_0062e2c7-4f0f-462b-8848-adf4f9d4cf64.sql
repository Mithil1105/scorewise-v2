
-- First, drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Institution admins can manage members" ON public.institution_members;
DROP POLICY IF EXISTS "Institution admins can view all members" ON public.institution_members;
DROP POLICY IF EXISTS "Teachers can view institution members" ON public.institution_members;

-- Create a security definer function to check institution membership without recursion
CREATE OR REPLACE FUNCTION public.is_institution_admin(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members
    WHERE user_id = _user_id
      AND institution_id = _institution_id
      AND role = 'inst_admin'
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_institution_teacher_or_admin(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members
    WHERE user_id = _user_id
      AND institution_id = _institution_id
      AND role IN ('teacher', 'inst_admin')
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_institution_member(_user_id uuid, _institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members
    WHERE user_id = _user_id
      AND institution_id = _institution_id
      AND status = 'active'
  )
$$;

-- Recreate RLS policies using the security definer functions
CREATE POLICY "Institution admins can manage members"
ON public.institution_members
FOR ALL
USING (public.is_institution_admin(auth.uid(), institution_id));

CREATE POLICY "Teachers can view institution members"
ON public.institution_members
FOR SELECT
USING (public.is_institution_teacher_or_admin(auth.uid(), institution_id));

-- Create batches table for class/batch management
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create batch_members junction table
CREATE TABLE public.batch_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.institution_members(id) ON DELETE CASCADE,
  added_at timestamp with time zone DEFAULT now(),
  UNIQUE(batch_id, member_id)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  topic text NOT NULL,
  exam_type text NOT NULL DEFAULT 'GRE',
  instructions text,
  due_date timestamp with time zone,
  max_word_count integer,
  min_word_count integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.institution_members(id) ON DELETE CASCADE,
  essay_id uuid REFERENCES public.essays(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  submitted_at timestamp with time zone,
  teacher_feedback text,
  teacher_score numeric,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(assignment_id, member_id)
);

-- Enable RLS on new tables
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for batches
CREATE POLICY "Institution members can view batches"
ON public.batches
FOR SELECT
USING (public.is_institution_member(auth.uid(), institution_id));

CREATE POLICY "Teachers and admins can manage batches"
ON public.batches
FOR ALL
USING (public.is_institution_teacher_or_admin(auth.uid(), institution_id));

-- RLS policies for batch_members
CREATE POLICY "Institution members can view batch members"
ON public.batch_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.id = batch_members.batch_id
    AND public.is_institution_member(auth.uid(), b.institution_id)
  )
);

CREATE POLICY "Teachers and admins can manage batch members"
ON public.batch_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.batches b
    WHERE b.id = batch_members.batch_id
    AND public.is_institution_teacher_or_admin(auth.uid(), b.institution_id)
  )
);

-- RLS policies for assignments
CREATE POLICY "Institution members can view assignments"
ON public.assignments
FOR SELECT
USING (public.is_institution_member(auth.uid(), institution_id));

CREATE POLICY "Teachers and admins can manage assignments"
ON public.assignments
FOR ALL
USING (public.is_institution_teacher_or_admin(auth.uid(), institution_id));

-- RLS policies for assignment_submissions
CREATE POLICY "Students can view their own submissions"
ON public.assignment_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.id = assignment_submissions.member_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Students can create their own submissions"
ON public.assignment_submissions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.id = assignment_submissions.member_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Students can update their own submissions"
ON public.assignment_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.id = assignment_submissions.member_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view all submissions in their institution"
ON public.assignment_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_submissions.assignment_id
    AND public.is_institution_teacher_or_admin(auth.uid(), a.institution_id)
  )
);

CREATE POLICY "Teachers can update submissions in their institution"
ON public.assignment_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_submissions.assignment_id
    AND public.is_institution_teacher_or_admin(auth.uid(), a.institution_id)
  )
);

-- Platform admins can manage everything
CREATE POLICY "Platform admins can manage batches"
ON public.batches
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can manage batch_members"
ON public.batch_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can manage assignments"
ON public.assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can manage assignment_submissions"
ON public.assignment_submissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_batches_updated_at
BEFORE UPDATE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
