-- Create essay_corrections table for simple teacher corrections
CREATE TABLE IF NOT EXISTS public.essay_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  start_index INT NOT NULL,
  end_index INT NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  teacher_note TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_essay_corrections_essay_id ON public.essay_corrections(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_corrections_created_at ON public.essay_corrections(created_at);

-- Enable RLS
ALTER TABLE public.essay_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Students can view corrections for their own essays
CREATE POLICY "Students can view corrections for their essays"
ON public.essay_corrections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.essays e
    WHERE e.id = essay_corrections.essay_id
    AND e.user_id = auth.uid()
  )
);

-- RLS Policy: Teachers can view corrections for essays in their institution
CREATE POLICY "Teachers can view corrections for institution essays"
ON public.essay_corrections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.essays e
    INNER JOIN public.institution_members im ON im.institution_id = e.institution_id
    WHERE e.id = essay_corrections.essay_id
    AND im.user_id = auth.uid()
    AND im.role IN ('teacher', 'inst_admin')
    AND im.status = 'active'
  )
);

-- RLS Policy: Teachers can create corrections for essays in their institution
CREATE POLICY "Teachers can create corrections for institution essays"
ON public.essay_corrections FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.essays e
    INNER JOIN public.institution_members im ON im.institution_id = e.institution_id
    WHERE e.id = essay_corrections.essay_id
    AND im.user_id = auth.uid()
    AND im.role IN ('teacher', 'inst_admin')
    AND im.status = 'active'
  )
);

-- RLS Policy: Teachers can update their own corrections
CREATE POLICY "Teachers can update their own corrections"
ON public.essay_corrections FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- RLS Policy: Teachers can delete their own corrections
CREATE POLICY "Teachers can delete their own corrections"
ON public.essay_corrections FOR DELETE
USING (created_by = auth.uid());

-- Comment on columns for documentation
COMMENT ON COLUMN public.essay_corrections.start_index IS 'Character index in original essay where correction begins';
COMMENT ON COLUMN public.essay_corrections.end_index IS 'Character index (exclusive) in original where text ends';
COMMENT ON COLUMN public.essay_corrections.original_text IS 'The original text that was selected for correction';
COMMENT ON COLUMN public.essay_corrections.corrected_text IS 'The teacher-provided corrected version';
COMMENT ON COLUMN public.essay_corrections.teacher_note IS 'Optional short advice or explanation';

