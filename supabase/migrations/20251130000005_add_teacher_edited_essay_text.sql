-- Add teacher_edited_essay_text column to essays table
-- This stores the teacher's edited version separately from the original
-- This ensures the original student submission is never lost

ALTER TABLE public.essays
ADD COLUMN IF NOT EXISTS teacher_edited_essay_text text;

-- Add comment
COMMENT ON COLUMN public.essays.teacher_edited_essay_text IS 'Stores the teacher-edited version of the essay. The original essay_text remains unchanged to preserve student submission.';

