-- Grammar Module Database Schema
-- Global predefined grammar bank (shared across all institutes)

-- Predefined Topics (Global)
CREATE TABLE public.predefined_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_key TEXT UNIQUE NOT NULL,
    topic_name TEXT NOT NULL,
    topic_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Predefined Exercises (Global)
CREATE TABLE public.predefined_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.predefined_topics(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Institute-specific Grammar Topics
CREATE TABLE public.grammar_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    topic_name TEXT NOT NULL,
    topic_description TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Institute-specific Grammar Exercises
CREATE TABLE public.grammar_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.grammar_topics(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('custom', 'ai')),
    difficulty INTEGER DEFAULT 1,
    use_ai_check BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily Practice Configuration (per teacher)
CREATE TABLE public.grammar_daily_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    source TEXT NOT NULL CHECK (source IN ('predefined', 'custom', 'ai', 'mixed')),
    question_count INTEGER DEFAULT 5,
    assign_time_utc TIME NOT NULL DEFAULT '09:00:00',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily Practice Students (which students receive daily practice from a teacher)
CREATE TABLE public.grammar_daily_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (teacher_id, student_id)
);

-- Daily Assignment Log
CREATE TABLE public.grammar_daily_assignment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    exercise_ids UUID[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (teacher_id, student_id, date)
);

-- Manual Assignments
CREATE TABLE public.grammar_manual_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    institute_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('predefined', 'custom', 'ai', 'mixed')),
    topic_type TEXT NOT NULL CHECK (topic_type IN ('predefined', 'institute')),
    topic_id UUID,
    batch_ids UUID[],
    student_ids UUID[],
    exercise_ids UUID[] NOT NULL,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grammar Attempts (student answers)
CREATE TABLE public.grammar_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('daily', 'manual', 'self_practice')),
    assignment_id UUID,
    exercise_id UUID NOT NULL,
    exercise_source_type TEXT NOT NULL CHECK (exercise_source_type IN ('predefined', 'custom', 'ai')),
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    score FLOAT DEFAULT 1.0,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.predefined_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predefined_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_daily_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_daily_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_daily_assignment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_manual_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for predefined_topics (read-only for all, admin-only write)
CREATE POLICY "Anyone can view predefined topics"
ON public.predefined_topics FOR SELECT
USING (true);

CREATE POLICY "Admins can manage predefined topics"
ON public.predefined_topics FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for predefined_exercises (read-only for all, admin-only write)
CREATE POLICY "Anyone can view predefined exercises"
ON public.predefined_exercises FOR SELECT
USING (true);

CREATE POLICY "Admins can manage predefined exercises"
ON public.predefined_exercises FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for grammar_topics (institute-scoped)
CREATE POLICY "Users can view topics from their institute"
ON public.grammar_topics FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_topics.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.status = 'active'
    )
);

CREATE POLICY "Teachers can create topics in their institute"
ON public.grammar_topics FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_topics.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role = 'teacher'
        AND institution_members.status = 'active'
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Teachers can update topics in their institute"
ON public.grammar_topics FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_topics.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role = 'teacher'
        AND institution_members.status = 'active'
    )
);

-- RLS Policies for grammar_exercises (institute-scoped)
CREATE POLICY "Users can view exercises from their institute"
ON public.grammar_exercises FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercises.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.status = 'active'
    )
);

CREATE POLICY "Teachers can create exercises in their institute"
ON public.grammar_exercises FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercises.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role = 'teacher'
        AND institution_members.status = 'active'
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Teachers can update exercises in their institute"
ON public.grammar_exercises FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_exercises.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role = 'teacher'
        AND institution_members.status = 'active'
    )
);

-- RLS Policies for grammar_daily_config (teacher-scoped)
CREATE POLICY "Teachers can view their own daily config"
ON public.grammar_daily_config FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can manage their own daily config"
ON public.grammar_daily_config FOR ALL
USING (teacher_id = auth.uid());

-- RLS Policies for grammar_daily_students (teacher-scoped)
CREATE POLICY "Teachers can view their daily students"
ON public.grammar_daily_students FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view if they are in daily practice"
ON public.grammar_daily_students FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage their daily students"
ON public.grammar_daily_students FOR ALL
USING (teacher_id = auth.uid());

-- RLS Policies for grammar_daily_assignment_log (teacher and student access)
CREATE POLICY "Teachers can view their assignment logs"
ON public.grammar_daily_assignment_log FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their own assignment logs"
ON public.grammar_daily_assignment_log FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "System can create assignment logs"
ON public.grammar_daily_assignment_log FOR INSERT
WITH CHECK (true); -- Edge function will use service role

-- RLS Policies for grammar_manual_assignments (institute-scoped)
CREATE POLICY "Users can view assignments from their institute"
ON public.grammar_manual_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_manual_assignments.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.status = 'active'
    )
);

CREATE POLICY "Teachers can create assignments in their institute"
ON public.grammar_manual_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_manual_assignments.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role = 'teacher'
        AND institution_members.status = 'active'
    )
    AND teacher_id = auth.uid()
);

CREATE POLICY "Teachers can update assignments in their institute"
ON public.grammar_manual_assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members
        WHERE institution_members.institution_id = grammar_manual_assignments.institute_id
        AND institution_members.user_id = auth.uid()
        AND institution_members.role = 'teacher'
        AND institution_members.status = 'active'
    )
    AND teacher_id = auth.uid()
);

-- RLS Policies for grammar_attempts (student-scoped)
CREATE POLICY "Students can view their own attempts"
ON public.grammar_attempts FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Teachers can view attempts from their institute students"
ON public.grammar_attempts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.institution_members im1
        JOIN public.institution_members im2 ON im1.institution_id = im2.institution_id
        WHERE im1.user_id = auth.uid()
        AND im1.role = 'teacher'
        AND im1.status = 'active'
        AND im2.user_id = grammar_attempts.student_id
        AND im2.status = 'active'
    )
);

CREATE POLICY "Students can create their own attempts"
ON public.grammar_attempts FOR INSERT
WITH CHECK (student_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_predefined_exercises_topic_id ON public.predefined_exercises(topic_id);
CREATE INDEX idx_grammar_topics_institute_id ON public.grammar_topics(institute_id);
CREATE INDEX idx_grammar_exercises_institute_id ON public.grammar_exercises(institute_id);
CREATE INDEX idx_grammar_exercises_topic_id ON public.grammar_exercises(topic_id);
CREATE INDEX idx_grammar_daily_config_teacher_id ON public.grammar_daily_config(teacher_id);
CREATE INDEX idx_grammar_daily_students_teacher_id ON public.grammar_daily_students(teacher_id);
CREATE INDEX idx_grammar_daily_students_student_id ON public.grammar_daily_students(student_id);
CREATE INDEX idx_grammar_daily_assignment_log_teacher_student_date ON public.grammar_daily_assignment_log(teacher_id, student_id, date);
CREATE INDEX idx_grammar_manual_assignments_institute_id ON public.grammar_manual_assignments(institute_id);
CREATE INDEX idx_grammar_manual_assignments_teacher_id ON public.grammar_manual_assignments(teacher_id);
CREATE INDEX idx_grammar_attempts_student_id ON public.grammar_attempts(student_id);
CREATE INDEX idx_grammar_attempts_assignment_id ON public.grammar_attempts(assignment_id);
CREATE INDEX idx_grammar_attempts_exercise_id ON public.grammar_attempts(exercise_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for grammar_daily_config
CREATE TRIGGER update_grammar_daily_config_updated_at
BEFORE UPDATE ON public.grammar_daily_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

