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
      const exerciseIds = assignment.exercise_ids || [];
      if (exerciseIds.length === 0) return;

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
    }
  };

  const handleComplete = async (results: Array<{ exerciseId: string; isCorrect: boolean; userAnswer: string }>) => {
    if (!user || !assignment) return;

    try {
      const exerciseSourceType: GrammarExerciseSourceType = 
        assignment.source_type === 'predefined' ? 'predefined' : 'custom';

      const attempts = results.map(result => ({
        student_id: user.id,
        assignment_type: 'manual' as const,
        assignment_id: assignment.id,
        exercise_id: result.exerciseId,
        exercise_source_type: exerciseSourceType,
        user_answer: result.userAnswer,
        is_correct: result.isCorrect,
        score: result.isCorrect ? 1.0 : 0.0
      }));

      const { error } = await supabase
        .from('grammar_attempts')
        .insert(attempts);

      if (error) throw error;

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

