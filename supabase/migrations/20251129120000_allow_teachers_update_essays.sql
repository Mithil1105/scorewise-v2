-- Allow teachers and institution admins to update essays for assignment submissions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'essays' 
    AND policyname = 'Teachers and admins can update institution assignment essays'
  ) THEN
    CREATE POLICY "Teachers and admins can update institution assignment essays"
ON public.essays FOR UPDATE
USING (
  institution_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = essays.institution_id
    AND im.user_id = auth.uid()
    AND im.role IN ('teacher', 'inst_admin')
    AND im.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.assignment_submissions asub
      WHERE asub.essay_id = essays.id
      AND EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id = asub.assignment_id
        AND a.institution_id = essays.institution_id
      )
    )
  )
)
WITH CHECK (
  institution_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = essays.institution_id
    AND im.user_id = auth.uid()
    AND im.role IN ('teacher', 'inst_admin')
    AND im.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.assignment_submissions asub
      WHERE asub.essay_id = essays.id
      AND EXISTS (
        SELECT 1 FROM public.assignments a
        WHERE a.id = asub.assignment_id
        AND a.institution_id = essays.institution_id
      )
    )
  )
);
  END IF;
END $$;
  END IF;
END $$;

