-- Add UPDATE policy for grammar_attempts to allow teachers and admins to override scores
-- This allows teachers/admins to update is_correct and score fields when reviewing submissions

-- Drop existing UPDATE policy if it exists (there shouldn't be one, but just in case)
DROP POLICY IF EXISTS "Teachers and admins can update attempts from their institute students" ON public.grammar_attempts;

-- Create UPDATE policy for teachers and admins
CREATE POLICY "Teachers and admins can update attempts from their institute students"
ON public.grammar_attempts FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members im1
        JOIN public.institution_members im2 ON im1.institution_id = im2.institution_id
        WHERE im1.user_id = auth.uid()
        AND im1.role IN ('teacher', 'inst_admin')
        AND im1.status = 'active'
        AND im2.user_id = grammar_attempts.student_id
        AND im2.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members im1
        JOIN public.institution_members im2 ON im1.institution_id = im2.institution_id
        WHERE im1.user_id = auth.uid()
        AND im1.role IN ('teacher', 'inst_admin')
        AND im1.status = 'active'
        AND im2.user_id = grammar_attempts.student_id
        AND im2.status = 'active'
    )
);

