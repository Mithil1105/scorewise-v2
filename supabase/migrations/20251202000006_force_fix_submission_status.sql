-- Force fix all submissions that have essay_id but wrong status
-- This is a one-time fix to correct any existing broken submissions

-- Update all submissions that have essay_id but status is not 'submitted' or 'reviewed'
UPDATE public.assignment_submissions
SET 
  status = CASE 
    WHEN status = 'reviewed' THEN 'reviewed'
    ELSE 'submitted'
  END,
  submitted_at = COALESCE(submitted_at, created_at, NOW())
WHERE essay_id IS NOT NULL 
  AND status NOT IN ('submitted', 'reviewed');

-- Verify the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM public.assignment_submissions
  WHERE essay_id IS NOT NULL 
    AND status IN ('submitted', 'reviewed');
  
  RAISE NOTICE 'Fixed % submissions with essay_id to have correct status', fixed_count;
END $$;

