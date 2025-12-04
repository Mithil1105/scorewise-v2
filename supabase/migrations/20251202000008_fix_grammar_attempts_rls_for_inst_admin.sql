-- Fix RLS policy for grammar_attempts to allow inst_admin role to view student attempts
-- Previously only 'teacher' role was allowed

-- Drop existing policy
DROP POLICY IF EXISTS "Teachers can view attempts from their institute students" ON public.grammar_attempts;

-- Create new policy that allows both teacher and inst_admin
CREATE POLICY "Teachers and admins can view attempts from their institute students"
ON public.grammar_attempts FOR SELECT
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
);

