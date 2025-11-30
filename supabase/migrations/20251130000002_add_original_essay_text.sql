-- Add original_essay_text column to assignment_submissions table
-- This stores the student's original essay text before teacher edits
-- Allows students to see what was changed (removed text vs added text)
ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS original_essay_text text;

