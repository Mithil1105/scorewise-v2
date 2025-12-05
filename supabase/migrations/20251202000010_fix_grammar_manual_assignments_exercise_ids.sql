-- Fix grammar_manual_assignments to make exercise_ids nullable
-- Since we're migrating to exercise_set_ids, exercise_ids should be nullable
-- for new assignments that use exercise sets instead

ALTER TABLE public.grammar_manual_assignments 
ALTER COLUMN exercise_ids DROP NOT NULL;

-- Set default to empty array for existing records if needed
-- This ensures backward compatibility
UPDATE public.grammar_manual_assignments 
SET exercise_ids = ARRAY[]::UUID[] 
WHERE exercise_ids IS NULL;

