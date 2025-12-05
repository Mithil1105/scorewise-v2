import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseRunner } from "@/components/grammar/ExerciseRunner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GrammarManualAssignment, GrammarExerciseSourceType } from "@/types/grammar";

export default function AssignmentDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<GrammarManualAssignment | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [showPractice, setShowPractice] = useState(false);

  useEffect(() => {
    if (assignmentId) {
      loadAssignment();
    }
  }, [assignmentId]);

  const loadAssignment = async () => {
    setLoading(true);
    try {
      const { data: assignmentData } = await supabase
        .from('grammar_manual_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentData) {
        setAssignment(assignmentData);
        await loadExercises(assignmentData);
      }
    } catch (error) {
      console.error("Error loading assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async (assignment: GrammarManualAssignment) => {
    try {
      // Use exercise_set_ids (new structure) or fallback to exercise_ids (old structure)
      const exerciseSetIds = assignment.exercise_set_ids || [];
      const exerciseIds = assignment.exercise_ids || [];

      // If using new structure (exercise_set_ids)
      if (exerciseSetIds.length > 0) {
        // Load all questions from all selected exercise sets
        const { data: questions, error: questionsError } = await supabase
          .from('grammar_questions')
          .select('*')
          .in('exercise_set_id', exerciseSetIds)
          .order('exercise_set_id, question_order');

        if (questionsError) {
          console.error("Error loading questions:", questionsError);
          return;
        }

        if (questions && questions.length > 0) {
          // Convert questions to exercise format for ExerciseRunner
          const exercisesData = questions.map(q => ({
            id: q.id,
            question: q.question,
            answer: q.answer,
            use_ai_check: false,
            exercise_set_id: q.exercise_set_id
          }));

          setExercises(exercisesData);
        } else {
          setExercises([]);
        }
        return;
      }

      // Fallback to old structure (exercise_ids) for backward compatibility
      if (exerciseIds.length === 0) {
        setExercises([]);
        return;
      }

      // Determine source type and load accordingly
      if (assignment.source_type === 'predefined' || assignment.topic_type === 'predefined') {
        const { data } = await supabase
          .from('predefined_exercises')
          .select('*')
          .in('id', exerciseIds);

        if (data) {
          setExercises(data.map(ex => ({ ...ex, use_ai_check: false })));
        }
      } else {
        const { data } = await supabase
          .from('grammar_exercises')
          .select('*')
          .in('id', exerciseIds);

        if (data) {
          setExercises(data);
        }
      }
    } catch (error) {
      console.error("Error loading exercises:", error);
      setExercises([]);
    }
  };

  const handleComplete = async (results: Array<{ exerciseId: string; isCorrect: boolean; userAnswer: string }>) => {
    if (!user || !assignment) return;

    try {
      const exerciseSourceType: GrammarExerciseSourceType = 
        assignment.source_type === 'predefined' ? 'predefined' : 'custom';

      // Get exercise_set_id and question_id from exercises array
      const attempts = results.map(result => {
        const exercise = exercises.find(ex => ex.id === result.exerciseId);
        return {
          student_id: user.id,
          assignment_type: 'manual' as const,
          assignment_id: assignment.id,
          exercise_id: result.exerciseId, // Keep for backward compatibility
          exercise_set_id: exercise?.exercise_set_id || null, // New field
          question_id: result.exerciseId, // question_id is the same as exerciseId for new structure
          exercise_source_type: exerciseSourceType,
          user_answer: result.userAnswer,
          is_correct: result.isCorrect,
          score: result.isCorrect ? 1.0 : 0.0
        };
      });

      const { error: attemptsError } = await supabase
        .from('grammar_attempts')
        .insert(attempts);

      if (attemptsError) throw attemptsError;

      // Create completion records for each unique exercise_set_id
      const exerciseSetMap = new Map<string, { correct: number; total: number }>();
      
      results.forEach(result => {
        const exercise = exercises.find(ex => ex.id === result.exerciseId);
        const exerciseSetId = exercise?.exercise_set_id;
        if (exerciseSetId) {
          if (!exerciseSetMap.has(exerciseSetId)) {
            exerciseSetMap.set(exerciseSetId, { correct: 0, total: 0 });
          }
          const stats = exerciseSetMap.get(exerciseSetId)!;
          stats.total++;
          if (result.isCorrect) {
            stats.correct++;
          }
        }
      });

      // Create completion records for each exercise set
      const completionPromises = Array.from(exerciseSetMap.entries()).map(([exerciseSetId, stats]) => {
        return supabase
          .from('grammar_exercise_completions')
          .upsert({
            student_id: user.id,
            exercise_set_id: exerciseSetId,
            assignment_type: 'manual',
            assignment_id: assignment.id,
            total_questions: stats.total,
            correct_answers: stats.correct,
            incorrect_answers: stats.total - stats.correct,
            score: stats.correct
          }, {
            onConflict: 'student_id,exercise_set_id,assignment_type,assignment_id'
          });
      });

      const completionResults = await Promise.all(completionPromises);
      const completionErrors = completionResults.filter(r => r.error);
      if (completionErrors.length > 0) {
        console.error("Error saving completions:", completionErrors);
      }

      setShowPractice(false);
      navigate('/grammar');
    } catch (error) {
      console.error("Error saving attempts:", error);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!assignment) {
    return (
      <PageLayout>
        <TopBar />
        <div className="px-4 py-6 max-w-5xl mx-auto">
          <p className="text-center text-muted-foreground">Assignment not found</p>
          <Button onClick={() => navigate('/grammar')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Grammar
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (showPractice && exercises.length > 0) {
    return (
      <PageLayout>
        <TopBar />
        <div className="px-4 py-6 max-w-5xl mx-auto">
          <ExerciseRunner
            exercises={exercises}
            exerciseSourceType={assignment.source_type === 'predefined' ? 'predefined' : 'custom'}
            assignmentType="manual"
            assignmentId={assignment.id}
            onComplete={handleComplete}
            onExit={() => setShowPractice(false)}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/grammar')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{assignment.title}</CardTitle>
            {assignment.due_date && (
              <p className="text-sm text-muted-foreground mt-2">
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} to complete
              </p>
              <Button
                onClick={() => setShowPractice(true)}
                disabled={exercises.length === 0}
                size="lg"
                className="w-full"
              >
                Start Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

