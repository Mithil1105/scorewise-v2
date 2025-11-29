-- Remove assignment clubbing support
-- This migration removes all clubbing functionality and related database structures

-- Drop RLS policies for assignment_groups
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Institution members can view assignment groups" ON public.assignment_groups;
  DROP POLICY IF EXISTS "Teachers and admins can create assignment groups" ON public.assignment_groups;
  DROP POLICY IF EXISTS "Teachers and admins can update assignment groups" ON public.assignment_groups;
  DROP POLICY IF EXISTS "Teachers and admins can delete assignment groups" ON public.assignment_groups;
END $$;

-- Drop trigger
DROP TRIGGER IF EXISTS update_assignment_groups_updated_at ON public.assignment_groups;

-- Drop indexes
DROP INDEX IF EXISTS idx_assignments_group_id;
DROP INDEX IF EXISTS idx_assignment_groups_institution;

-- Remove columns from assignments table
ALTER TABLE public.assignments
DROP COLUMN IF EXISTS group_id;

ALTER TABLE public.assignments
DROP COLUMN IF EXISTS order_in_group;

-- Drop the assignment_groups table
DROP TABLE IF EXISTS public.assignment_groups CASCADE;

