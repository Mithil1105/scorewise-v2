-- Add assignment clubbing support
-- Allows teachers to club multiple assignments together (e.g., IELTS Task 1 + Task 2)

-- Create assignment_groups table
CREATE TABLE IF NOT EXISTS public.assignment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  total_time_minutes integer NOT NULL DEFAULT 60, -- Combined time for all assignments in group
  created_by uuid NOT NULL, -- user_id of teacher who created it
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add group_id to assignments table
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.assignment_groups(id) ON DELETE SET NULL;

-- Add order_in_group to assignments (for ordering within a group)
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS order_in_group integer DEFAULT 0;

-- Enable RLS on assignment_groups
ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignment_groups
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'assignment_groups' 
    AND policyname = 'Institution members can view assignment groups'
  ) THEN
    CREATE POLICY "Institution members can view assignment groups"
    ON public.assignment_groups
    FOR SELECT
    USING (public.is_institution_member(auth.uid(), institution_id));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'assignment_groups' 
    AND policyname = 'Teachers and admins can create assignment groups'
  ) THEN
    CREATE POLICY "Teachers and admins can create assignment groups"
    ON public.assignment_groups
    FOR INSERT
    WITH CHECK (
      public.is_institution_teacher_or_admin(auth.uid(), institution_id)
      AND created_by = auth.uid()
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'assignment_groups' 
    AND policyname = 'Teachers and admins can update assignment groups'
  ) THEN
    CREATE POLICY "Teachers and admins can update assignment groups"
    ON public.assignment_groups
    FOR UPDATE
    USING (public.is_institution_teacher_or_admin(auth.uid(), institution_id));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'assignment_groups' 
    AND policyname = 'Teachers and admins can delete assignment groups'
  ) THEN
    CREATE POLICY "Teachers and admins can delete assignment groups"
    ON public.assignment_groups
    FOR DELETE
    USING (public.is_institution_teacher_or_admin(auth.uid(), institution_id));
  END IF;
END $$;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON public.assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignment_groups_institution ON public.assignment_groups(institution_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_assignment_groups_updated_at ON public.assignment_groups;
CREATE TRIGGER update_assignment_groups_updated_at
BEFORE UPDATE ON public.assignment_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

