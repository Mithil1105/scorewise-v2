-- Auto-fix submission status for submissions with essay_id
-- This ensures that any submission with an essay_id is marked as 'submitted'
-- This is a safety net to catch any edge cases

CREATE OR REPLACE FUNCTION auto_fix_submission_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If essay_id is set and status is not 'submitted' or 'reviewed', fix it
  IF NEW.essay_id IS NOT NULL 
     AND NEW.status NOT IN ('submitted', 'reviewed')
     AND (NEW.submitted_at IS NOT NULL OR NEW.status = 'in_progress') THEN
    NEW.status := 'submitted';
    -- Set submitted_at if not already set
    IF NEW.submitted_at IS NULL THEN
      NEW.submitted_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS auto_fix_submission_status_trigger ON public.assignment_submissions;

-- Create trigger to auto-fix status on INSERT and UPDATE
CREATE TRIGGER auto_fix_submission_status_trigger
BEFORE INSERT OR UPDATE ON public.assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION auto_fix_submission_status();

-- Also fix any existing submissions that have essay_id but wrong status
UPDATE public.assignment_submissions
SET 
  status = 'submitted',
  submitted_at = COALESCE(submitted_at, created_at, NOW())
WHERE essay_id IS NOT NULL 
  AND status NOT IN ('submitted', 'reviewed');

