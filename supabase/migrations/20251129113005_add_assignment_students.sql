-- Create assignment_students junction table for student-specific assignments
-- This allows teachers to assign assignments to specific students regardless of batch
CREATE TABLE public.assignment_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.institution_members(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(assignment_id, member_id)
);

-- Enable RLS
ALTER TABLE public.assignment_students ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment_students
-- Institution members can view assignment_students
CREATE POLICY "Institution members can view assignment_students"
ON public.assignment_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_students.assignment_id
    AND public.is_institution_member(auth.uid(), a.institution_id)
  )
);

-- Teachers and admins can manage assignment_students
CREATE POLICY "Teachers and admins can manage assignment_students"
ON public.assignment_students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_students.assignment_id
    AND public.is_institution_teacher_or_admin(auth.uid(), a.institution_id)
  )
);

-- Platform admins have full access
CREATE POLICY "Platform admins can manage assignment_students"
ON public.assignment_students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

