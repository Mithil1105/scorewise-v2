-- Ensure essays table has all required columns
-- This migration is idempotent and can be run multiple times safely

-- Ensure essay_text column exists and is not null by default (but allow null for drafts)
DO $$
BEGIN
    -- Check if essay_text column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'essays' 
        AND column_name = 'essay_text'
    ) THEN
        ALTER TABLE public.essays ADD COLUMN essay_text TEXT;
    END IF;
END $$;

-- Ensure all other required columns exist
ALTER TABLE public.essays 
    ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS exam_type TEXT NOT NULL,
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ai_score NUMERIC(3,1),
    ADD COLUMN IF NOT EXISTS ai_feedback TEXT,
    ADD COLUMN IF NOT EXISTS local_id TEXT,
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS institution_member_id UUID REFERENCES public.institution_members(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS teacher_edited_essay_text TEXT,
    ADD COLUMN IF NOT EXISTS finalized_teacher_text TEXT,
    ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS task1_image_url TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_essays_user_id ON public.essays(user_id);
CREATE INDEX IF NOT EXISTS idx_essays_local_id ON public.essays(local_id);
CREATE INDEX IF NOT EXISTS idx_essays_updated_at ON public.essays(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_essays_institution_id ON public.essays(institution_id);
CREATE INDEX IF NOT EXISTS idx_essays_share_token ON public.essays(share_token);

-- Ensure RLS is enabled
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies to ensure they're correct (idempotent)
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own essays" ON public.essays;
    DROP POLICY IF EXISTS "Users can create their own essays" ON public.essays;
    DROP POLICY IF EXISTS "Users can update their own essays" ON public.essays;
    DROP POLICY IF EXISTS "Users can delete their own essays" ON public.essays;
    DROP POLICY IF EXISTS "Anyone can view shared essays by token" ON public.essays;
    DROP POLICY IF EXISTS "Teachers can view essays in their institution" ON public.essays;
    DROP POLICY IF EXISTS "Teachers can update essays in their institution" ON public.essays;
    DROP POLICY IF EXISTS "Institution admins can view essays in their institution" ON public.essays;
    DROP POLICY IF EXISTS "Admins can view all essays" ON public.essays;
END $$;

-- Users can view their own essays
CREATE POLICY "Users can view their own essays"
ON public.essays FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own essays
CREATE POLICY "Users can create their own essays"
ON public.essays FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own essays
CREATE POLICY "Users can update their own essays"
ON public.essays FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own essays
CREATE POLICY "Users can delete their own essays"
ON public.essays FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can view shared essays by token (public access for shared essays)
CREATE POLICY "Anyone can view shared essays by token"
ON public.essays FOR SELECT
USING (share_token IS NOT NULL);

-- Teachers can view essays in their institution
CREATE POLICY "Teachers can view essays in their institution"
ON public.essays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = essays.institution_id
    AND im.user_id = auth.uid()
    AND im.role IN ('teacher', 'inst_admin')
    AND im.status = 'active'
  )
);

-- Teachers can update essays in their institution
CREATE POLICY "Teachers can update essays in their institution"
ON public.essays FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = essays.institution_id
    AND im.user_id = auth.uid()
    AND im.role IN ('teacher', 'inst_admin')
    AND im.status = 'active'
  )
);

-- Institution admins can view essays in their institution
CREATE POLICY "Institution admins can view essays in their institution"
ON public.essays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = essays.institution_id
    AND im.user_id = auth.uid()
    AND im.role = 'inst_admin'
    AND im.status = 'active'
  )
);

-- Platform admins can view all essays
CREATE POLICY "Admins can view all essays"
ON public.essays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Add comment to essay_text column
COMMENT ON COLUMN public.essays.essay_text IS 'The main essay content written by the student. Can be null for drafts.';

