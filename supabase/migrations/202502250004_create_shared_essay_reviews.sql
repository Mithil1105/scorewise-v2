-- Create table for storing teacher reviews of shared essays
CREATE TABLE IF NOT EXISTS public.shared_essay_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  teacher_feedback TEXT,
  teacher_score NUMERIC(3,1),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(essay_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shared_essay_reviews_essay_id ON public.shared_essay_reviews(essay_id);
CREATE INDEX IF NOT EXISTS idx_shared_essay_reviews_reviewed_by ON public.shared_essay_reviews(reviewed_by);

-- Enable RLS
ALTER TABLE public.shared_essay_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Students can view their own shared essay reviews" ON public.shared_essay_reviews;
DROP POLICY IF EXISTS "Teachers can view shared essay reviews in their institution" ON public.shared_essay_reviews;
DROP POLICY IF EXISTS "Teachers can manage shared essay reviews in their institution" ON public.shared_essay_reviews;
DROP POLICY IF EXISTS "Teachers can insert shared essay reviews in their institution" ON public.shared_essay_reviews;
DROP POLICY IF EXISTS "Teachers can update shared essay reviews in their institution" ON public.shared_essay_reviews;
DROP POLICY IF EXISTS "Teachers can delete shared essay reviews in their institution" ON public.shared_essay_reviews;

-- RLS Policies
-- Students can view reviews of their own shared essays
CREATE POLICY "Students can view their own shared essay reviews"
  ON public.shared_essay_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.essays
      WHERE essays.id = shared_essay_reviews.essay_id
      AND essays.user_id = auth.uid()
    )
  );

-- Teachers and admins can view reviews within their institution
CREATE POLICY "Teachers can view shared essay reviews in their institution"
  ON public.shared_essay_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.essays
      WHERE essays.id = shared_essay_reviews.essay_id
      AND essays.institution_id IS NOT NULL
      AND public.is_institution_teacher_or_admin(auth.uid(), essays.institution_id)
    )
  );

-- Teachers and admins can insert reviews for shared essays in their institution
CREATE POLICY "Teachers can insert shared essay reviews in their institution"
  ON public.shared_essay_reviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.essays
      WHERE essays.id = shared_essay_reviews.essay_id
      AND essays.shared_with_teacher = true
      AND essays.institution_id IS NOT NULL
      AND public.is_institution_teacher_or_admin(auth.uid(), essays.institution_id)
    )
  );

-- Teachers and admins can update reviews for shared essays in their institution
CREATE POLICY "Teachers can update shared essay reviews in their institution"
  ON public.shared_essay_reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.essays
      WHERE essays.id = shared_essay_reviews.essay_id
      AND essays.shared_with_teacher = true
      AND essays.institution_id IS NOT NULL
      AND public.is_institution_teacher_or_admin(auth.uid(), essays.institution_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.essays
      WHERE essays.id = shared_essay_reviews.essay_id
      AND essays.shared_with_teacher = true
      AND essays.institution_id IS NOT NULL
      AND public.is_institution_teacher_or_admin(auth.uid(), essays.institution_id)
    )
  );

-- Teachers and admins can delete reviews for shared essays in their institution
CREATE POLICY "Teachers can delete shared essay reviews in their institution"
  ON public.shared_essay_reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.essays
      WHERE essays.id = shared_essay_reviews.essay_id
      AND essays.shared_with_teacher = true
      AND essays.institution_id IS NOT NULL
      AND public.is_institution_teacher_or_admin(auth.uid(), essays.institution_id)
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shared_essay_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_shared_essay_reviews_updated_at ON public.shared_essay_reviews;

CREATE TRIGGER update_shared_essay_reviews_updated_at
  BEFORE UPDATE ON public.shared_essay_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_essay_reviews_updated_at();

