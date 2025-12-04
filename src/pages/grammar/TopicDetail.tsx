import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseRunner } from "@/components/grammar/ExerciseRunner";
import { Loader2, ArrowLeft, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PredefinedTopic, GrammarTopic, GrammarExerciseSourceType } from "@/types/grammar";

export default function TopicDetail() {
  const { topicId, type } = useParams<{ topicId: string; type: 'predefined' | 'institute' }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<PredefinedTopic | GrammarTopic | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [showPractice, setShowPractice] = useState(false);

  useEffect(() => {
    if (topicId && type) {
      loadTopicAndExercises();
    }
  }, [topicId, type]);

  const loadTopicAndExercises = async () => {
    setLoading(true);
    try {
      if (type === 'predefined') {
        // Load predefined topic
        const { data: topicData } = await supabase
          .from('predefined_topics')
          .select('*')
          .eq('id', topicId)
          .single();

        if (topicData) {
          setTopic(topicData);

          // Load exercises
          const { data: exercisesData } = await supabase
            .from('predefined_exercises')
            .select('*')
            .eq('topic_id', topicId)
            .order('difficulty');

          if (exercisesData) {
            setExercises(exercisesData.map(ex => ({ ...ex, use_ai_check: false })));
          }
        }
      } else {
        // Load institute topic
        const { data: topicData } = await supabase
          .from('grammar_topics')
          .select('*')
          .eq('id', topicId)
          .single();

        if (topicData) {
          setTopic(topicData);

          // Load exercises
          // If topicId is 'general', load exercises with null topic_id
          // Otherwise, load exercises with this topic_id
          let query = supabase
            .from('grammar_exercises')
            .select('*')
            .eq('institute_id', topicData.institute_id);

          if (topicId === 'general') {
            query = query.is('topic_id', null);
          } else {
            query = query.eq('topic_id', topicId);
          }

          const { data: exercisesData, error: exercisesError } = await query.order('difficulty');

          if (exercisesError) {
            console.error("Error loading exercises:", exercisesError);
          } else if (exercisesData) {
            console.log("Loaded exercises:", exercisesData.length, exercisesData);
            setExercises(exercisesData);
          }
        }
      }
    } catch (error) {
      console.error("Error loading topic:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (results: Array<{ exerciseId: string; isCorrect: boolean; userAnswer: string }>) => {
    // Save attempts
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const exerciseSourceType: GrammarExerciseSourceType = type === 'predefined' ? 'predefined' : 'custom';
      
      const attempts = results.map(result => ({
        student_id: user.id,
        assignment_type: 'self_practice' as const,
        assignment_id: null,
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
      // Show completion message or navigate back
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

  if (!topic) {
    return (
      <PageLayout>
        <TopBar />
        <div className="px-4 py-6 max-w-5xl mx-auto">
          <p className="text-center text-muted-foreground">Topic not found</p>
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
            exerciseSourceType={type === 'predefined' ? 'predefined' : 'custom'}
            assignmentType="self_practice"
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
            <CardTitle className="text-2xl">{topic.topic_name}</CardTitle>
            <CardDescription className="text-base mt-2">
              {topic.topic_description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} available
                </p>
                <Button
                  onClick={() => setShowPractice(true)}
                  disabled={exercises.length === 0}
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Practice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

