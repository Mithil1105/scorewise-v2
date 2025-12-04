-- Fix assignment_submissions issues
-- 1. Add constraint to prevent status changes after submission
-- 2. Ensure proper status values

-- Add check constraint for status values
ALTER TABLE public.assignment_submissions
DROP CONSTRAINT IF EXISTS assignment_submissions_status_check;

ALTER TABLE public.assignment_submissions
ADD CONSTRAINT assignment_submissions_status_check 
CHECK (status IN ('pending', 'in_progress', 'submitted', 'reviewed'));

-- Update any submissions with essay_id and submitted_at to have status 'submitted'
UPDATE public.assignment_submissions
SET status = 'submitted'
WHERE essay_id IS NOT NULL 
  AND submitted_at IS NOT NULL
  AND status != 'submitted'
  AND status != 'reviewed';

-- Function to prevent status changes after submission (unless reviewed)
CREATE OR REPLACE FUNCTION prevent_submission_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- If old status is 'submitted' or 'reviewed', only allow changes to 'reviewed' status
  IF OLD.status IN ('submitted', 'reviewed') AND NEW.status NOT IN ('submitted', 'reviewed') THEN
    RAISE EXCEPTION 'Cannot change status from submitted/reviewed back to in_progress or pending';
  END IF;
  
  -- If old status is 'reviewed', don't allow any changes except by teachers
  IF OLD.status = 'reviewed' AND NEW.status != 'reviewed' THEN
    RAISE EXCEPTION 'Cannot change status from reviewed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS prevent_submission_edit_trigger ON public.assignment_submissions;

-- Create trigger
CREATE TRIGGER prevent_submission_edit_trigger
BEFORE UPDATE ON public.assignment_submissions
FOR EACH ROW
WHEN (OLD.status IN ('submitted', 'reviewed'))
EXECUTE FUNCTION prevent_submission_edit();

-- Ensure essays are visible to teachers in the same institution
-- This is already handled by RLS, but let's verify the policies are correct

