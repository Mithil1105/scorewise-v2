-- Add shared_with_teacher column to essays table
-- This allows students to voluntarily share their essays with teachers

ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS shared_with_teacher BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.essays.shared_with_teacher IS 'Whether the student has voluntarily shared this essay with their teacher for review.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_essays_shared_with_teacher 
ON public.essays(institution_id, shared_with_teacher) 
WHERE shared_with_teacher = TRUE;

-- Update RLS to allow students to update shared_with_teacher for their own essays
-- This is already covered by the existing "Users can update their own essays" policy

