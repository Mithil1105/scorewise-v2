-- Create grammar exercise sets structure
-- An exercise set contains multiple questions and represents a complete exercise

-- Grammar Exercise Sets (containers for multiple questions)
CREATE TABLE public.grammar_exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.grammar_topics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 3),
    estimated_time INTEGER, -- in minutes
    instructions TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grammar Questions (individual questions within an exercise set)
CREATE TABLE public.grammar_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_set_id UUID REFERENCES public.grammar_exercise_sets(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL, -- can contain multiple answers separated by |
    question_order INTEGER NOT NULL DEFAULT 0, -- order within the exercise set
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update grammar_attempts to track both exercise set and question level
-- Add exercise_set_id column
ALTER TABLE public.grammar_attempts 
ADD COLUMN IF NOT EXISTS exercise_set_id UUID REFERENCES public.grammar_exercise_sets(id) ON DELETE CASCADE;

-- Add question_id column (references grammar_questions)
ALTER TABLE public.grammar_attempts 
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.grammar_questions(id) ON DELETE CASCADE;

-- Add exercise completion tracking
CREATE TABLE public.grammar_exercise_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exercise_set_id UUID REFERENCES public.grammar_exercise_sets(id) ON DELETE CASCADE NOT NULL,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('daily', 'manual', 'self_practice')),
    assignment_id UUID,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    incorrect_answers INTEGER NOT NULL DEFAULT 0,
    score FLOAT DEFAULT 0.0,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, exercise_set_id, assignment_type, assignment_id)
);

-- Update grammar_manual_assignments to reference exercise sets instead of individual exercises
ALTER TABLE public.grammar_manual_assignments 
ADD COLUMN IF NOT EXISTS exercise_set_ids UUID[];

-- Create indexes
CREATE INDEX idx_grammar_exercise_sets_institute_id ON public.grammar_exercise_sets(institute_id);
CREATE INDEX idx_grammar_exercise_sets_topic_id ON public.grammar_exercise_sets(topic_id);
CREATE INDEX idx_grammar_questions_exercise_set_id ON public.grammar_questions(exercise_set_id);
CREATE INDEX idx_grammar_questions_order ON public.grammar_questions(exercise_set_id, question_order);
CREATE INDEX idx_grammar_attempts_exercise_set_id ON public.grammar_attempts(exercise_set_id);
CREATE INDEX idx_grammar_attempts_question_id ON public.grammar_attempts(question_id);
CREATE INDEX idx_grammar_exercise_completions_student_id ON public.grammar_exercise_completions(student_id);
CREATE INDEX idx_grammar_exercise_completions_exercise_set_id ON public.grammar_exercise_completions(exercise_set_id);

-- Enable RLS
ALTER TABLE public.grammar_exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_exercise_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grammar_exercise_sets
CREATE POLICY "Users can view exercise sets from their institute"
ON public.grammar_exercise_sets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercise_sets.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.status = 'active'
    )
);

CREATE POLICY "Teachers and admins can create exercise sets in their institute"
ON public.grammar_exercise_sets FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercise_sets.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Teachers and admins can update exercise sets in their institute"
ON public.grammar_exercise_sets FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercise_sets.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
);

CREATE POLICY "Teachers and admins can delete exercise sets in their institute"
ON public.grammar_exercise_sets FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercise_sets.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role IN ('teacher', 'inst_admin')
        AND institution_members.status = 'active'
    )
);

-- RLS Policies for grammar_questions
CREATE POLICY "Users can view questions from exercise sets in their institute"
ON public.grammar_questions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.grammar_exercise_sets ges
        JOIN public.institution_members im ON im.institution_id = ges.institute_id
        WHERE ges.id = grammar_questions.exercise_set_id
        AND im.user_id = auth.uid()
        AND im.status = 'active'
    )
);

CREATE POLICY "Teachers and admins can create questions in their institute"
ON public.grammar_questions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.grammar_exercise_sets ges
        JOIN public.institution_members im ON im.institution_id = ges.institute_id
        WHERE ges.id = grammar_questions.exercise_set_id
        AND im.user_id = auth.uid()
        AND im.role IN ('teacher', 'inst_admin')
        AND im.status = 'active'
    )
);

CREATE POLICY "Teachers and admins can update questions in their institute"
ON public.grammar_questions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.grammar_exercise_sets ges
        JOIN public.institution_members im ON im.institution_id = ges.institute_id
        WHERE ges.id = grammar_questions.exercise_set_id
        AND im.user_id = auth.uid()
        AND im.role IN ('teacher', 'inst_admin')
        AND im.status = 'active'
    )
);

CREATE POLICY "Teachers and admins can delete questions in their institute"
ON public.grammar_questions FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.grammar_exercise_sets ges
        JOIN public.institution_members im ON im.institution_id = ges.institute_id
        WHERE ges.id = grammar_questions.exercise_set_id
        AND im.user_id = auth.uid()
        AND im.role IN ('teacher', 'inst_admin')
        AND im.status = 'active'
    )
);

-- RLS Policies for grammar_exercise_completions
CREATE POLICY "Students can view their own completions"
ON public.grammar_exercise_completions FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Teachers and admins can view completions from their institute students"
ON public.grammar_exercise_completions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.grammar_exercise_sets ges
        JOIN public.institution_members im1 ON im1.institution_id = ges.institute_id
        JOIN public.institution_members im2 ON im2.institution_id = ges.institute_id
        WHERE ges.id = grammar_exercise_completions.exercise_set_id
        AND im1.user_id = auth.uid()
        AND im1.role IN ('teacher', 'inst_admin')
        AND im1.status = 'active'
        AND im2.user_id = grammar_exercise_completions.student_id
        AND im2.status = 'active'
    )
);

CREATE POLICY "Students can create their own completions"
ON public.grammar_exercise_completions FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own completions"
ON public.grammar_exercise_completions FOR UPDATE
USING (student_id = auth.uid());

-- Migrate existing grammar_exercises to exercise sets
-- Group by topic_id and institute_id
DO $$
DECLARE
    topic_record RECORD;
    exercise_set_id_val UUID;
    question_count INTEGER;
BEGIN
    -- Create exercise sets for each topic
    FOR topic_record IN 
        SELECT DISTINCT 
            ge.institute_id, 
            ge.topic_id, 
            CASE 
                WHEN ge.topic_id IS NULL THEN 'General Grammar Exercises'
                ELSE COALESCE(gt.topic_name, 'Unknown Topic')
            END as topic_name,
            (SELECT ge2.created_by FROM public.grammar_exercises ge2 
             WHERE ge2.institute_id = ge.institute_id 
             AND (ge2.topic_id = ge.topic_id OR (ge2.topic_id IS NULL AND ge.topic_id IS NULL))
             AND ge2.created_by IS NOT NULL
             LIMIT 1) as created_by
        FROM public.grammar_exercises ge
        LEFT JOIN public.grammar_topics gt ON gt.id = ge.topic_id
        WHERE ge.institute_id IS NOT NULL
        GROUP BY ge.institute_id, ge.topic_id, gt.topic_name
    LOOP
        -- Create exercise set
        INSERT INTO public.grammar_exercise_sets (
            institute_id, 
            topic_id, 
            title, 
            description,
            difficulty,
            created_by
        )
        VALUES (
            topic_record.institute_id,
            topic_record.topic_id,
            topic_record.topic_name || ' Exercise',
            'Migrated from existing grammar exercises',
            1,
            topic_record.created_by
        )
        RETURNING id INTO exercise_set_id_val;

        -- Migrate questions with proper ordering
        INSERT INTO public.grammar_questions (
            exercise_set_id,
            question,
            answer,
            question_order
        )
        SELECT 
            exercise_set_id_val,
            ge.question,
            ge.answer,
            ROW_NUMBER() OVER (ORDER BY ge.created_at) - 1 as question_order
        FROM public.grammar_exercises ge
        WHERE ge.institute_id = topic_record.institute_id
        AND (
            (ge.topic_id = topic_record.topic_id) 
            OR (ge.topic_id IS NULL AND topic_record.topic_id IS NULL)
        )
        ORDER BY ge.created_at;
    END LOOP;
END $$;

