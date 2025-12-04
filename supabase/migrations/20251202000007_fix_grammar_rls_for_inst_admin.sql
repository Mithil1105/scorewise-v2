-- Fix RLS policies to allow inst_admin role to create and manage grammar exercises and topics
-- Previously only 'teacher' role was allowed

-- Drop existing policies for grammar_topics
DROP POLICY IF EXISTS "Teachers can create topics in their institute" ON public.grammar_topics;
DROP POLICY IF EXISTS "Teachers can update topics in their institute" ON public.grammar_topics;

-- Create new policies that allow both teacher and inst_admin
CREATE POLICY "Teachers and admins can create topics in their institute"
ON public.grammar_topics FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_topics.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Teachers and admins can update topics in their institute"
ON public.grammar_topics FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_topics.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
);

-- Drop existing policies for grammar_exercises
DROP POLICY IF EXISTS "Teachers can create exercises in their institute" ON public.grammar_exercises;
DROP POLICY IF EXISTS "Teachers can update exercises in their institute" ON public.grammar_exercises;

-- Create new policies that allow both teacher and inst_admin
CREATE POLICY "Teachers and admins can create exercises in their institute"
ON public.grammar_exercises FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercises.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Teachers and admins can update exercises in their institute"
ON public.grammar_exercises FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercises.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
);

-- Also fix grammar_manual_assignments policies
DROP POLICY IF EXISTS "Teachers can create assignments in their institute" ON public.grammar_manual_assignments;
DROP POLICY IF EXISTS "Teachers can update assignments in their institute" ON public.grammar_manual_assignments;

CREATE POLICY "Teachers and admins can create assignments in their institute"
ON public.grammar_manual_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_manual_assignments.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
    AND teacher_id = auth.uid()
);

CREATE POLICY "Teachers and admins can update assignments in their institute"
ON public.grammar_manual_assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_manual_assignments.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
);

