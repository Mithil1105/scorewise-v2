-- Add original_essay_text column to essays table
-- This stores the original essay text from first submission
-- Never overwritten to preserve student submission

ALTER TABLE public.essays
ADD COLUMN IF NOT EXISTS original_essay_text TEXT;

-- Add comment
COMMENT ON COLUMN public.essays.original_essay_text IS 'Stores the original essay text from first submission. Never overwritten to preserve student submission.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_essays_original_essay_text 
ON public.essays(original_essay_text) 
WHERE original_essay_text IS NOT NULL;

