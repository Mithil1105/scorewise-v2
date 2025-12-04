-- Fix RLS to ensure teachers can view essays linked to assignment submissions
-- This is a critical fix to allow teachers to see submitted assignment essays

-- Add policy to allow teachers to view essays that are linked to assignment submissions
-- in their institution, even if the essay doesn't have institution_id set properly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'essays' 
    AND policyname = 'Teachers can view assignment essays via submissions'
  ) THEN
    CREATE POLICY "Teachers can view assignment essays via submissions"
    ON public.essays FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.assignment_submissions asub
        WHERE asub.essay_id = essays.id
        AND EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = asub.assignment_id
          AND EXISTS (
            SELECT 1 FROM public.institution_members im
            WHERE im.institution_id = a.institution_id
            AND im.user_id = auth.uid()
            AND im.role IN ('teacher', 'inst_admin')
            AND im.status = 'active'
          )
        )
      )
    );
  END IF;
END $$;

-- Also ensure that essays with institution_id are visible to teachers
-- This should already exist but let's make sure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'essays' 
    AND policyname = 'Teachers can view essays in their institution'
  ) THEN
    CREATE POLICY "Teachers can view essays in their institution"
    ON public.essays FOR SELECT
    USING (
      institution_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.institution_members im
        WHERE im.institution_id = essays.institution_id
        AND im.user_id = auth.uid()
        AND im.role IN ('teacher', 'inst_admin')
        AND im.status = 'active'
      )
    );
  END IF;
END $$;

