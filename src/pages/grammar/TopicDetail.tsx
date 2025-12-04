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
  const [exerciseSets, setExerciseSets] = useState<any[]>([]);
  const [selectedExerciseSet, setSelectedExerciseSet] = useState<any | null>(null);
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
            // For predefined, we can start practice directly
            // setShowPractice(true); // Uncomment if you want auto-start for predefined
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

          // Load exercise sets and their questions
          // If topicId is 'general', load exercise sets with null topic_id
          // Otherwise, load exercise sets with this topic_id
          let exerciseSetQuery = supabase
            .from('grammar_exercise_sets')
            .select('*')
            .eq('institute_id', topicData.institute_id);

          if (topicId === 'general') {
            exerciseSetQuery = exerciseSetQuery.is('topic_id', null);
          } else {
            exerciseSetQuery = exerciseSetQuery.eq('topic_id', topicId);
          }

          const { data: exerciseSetsData, error: exerciseSetsError } = await exerciseSetQuery.order('created_at');

          if (exerciseSetsError) {
            console.error("Error loading exercise sets:", exerciseSetsError);
          } else if (exerciseSetsData && exerciseSetsData.length > 0) {
            // Load question counts for each exercise set
            const exerciseSetsWithCounts = await Promise.all(
              exerciseSetsData.map(async (exerciseSet) => {
                const { count } = await supabase
                  .from('grammar_questions')
                  .select('*', { count: 'exact', head: true })
                  .eq('exercise_set_id', exerciseSet.id);
                
                return {
                  ...exerciseSet,
                  question_count: count || 0
                };
              })
            );
            
            setExerciseSets(exerciseSetsWithCounts);
          } else {
            setExerciseSets([]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading topic:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionsForExerciseSet = async (exerciseSetId: string) => {
    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('grammar_questions')
        .select('*')
        .eq('exercise_set_id', exerciseSetId)
        .order('question_order');

      if (questionsError) {
        console.error("Error loading questions:", questionsError);
      } else if (questionsData) {
        const exerciseSet = exerciseSets.find(es => es.id === exerciseSetId);
        const formattedExercises = questionsData.map(q => ({
          id: q.id,
          question: q.question,
          answer: q.answer,
          difficulty: exerciseSet?.difficulty || 1,
          exercise_set_id: q.exercise_set_id,
          exercise_set_title: exerciseSet?.title || 'Untitled Exercise'
        }));
        setExercises(formattedExercises);
        setShowPractice(true);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const handleExerciseSetSelect = (exerciseSet: any) => {
    setSelectedExerciseSet(exerciseSet);
    loadQuestionsForExerciseSet(exerciseSet.id);
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
        exercise_set_id: selectedExerciseSet?.id || null,
        question_id: result.exerciseId,
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
      setSelectedExerciseSet(null);
      setExercises([]);
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

  if (showPractice && exercises.length > 0 && selectedExerciseSet) {
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
              {type === 'institute' && exerciseSets.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      {exerciseSets.length} {exerciseSets.length === 1 ? 'exercise set' : 'exercise sets'} available
                    </p>
                  </div>
                  <div className="space-y-3">
                    {exerciseSets.map((exerciseSet) => (
                      <Card key={exerciseSet.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleExerciseSetSelect(exerciseSet)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{exerciseSet.title}</h3>
                              {exerciseSet.description && (
                                <p className="text-sm text-muted-foreground mt-1">{exerciseSet.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>{exerciseSet.question_count} {exerciseSet.question_count === 1 ? 'question' : 'questions'}</span>
                                <span>Difficulty: {exerciseSet.difficulty === 1 ? 'Easy' : exerciseSet.difficulty === 2 ? 'Medium' : 'Hard'}</span>
                                {exerciseSet.estimated_time && (
                                  <span>~{exerciseSet.estimated_time} min</span>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExerciseSetSelect(exerciseSet);
                              }}
                              size="lg"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Practice
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : type === 'predefined' ? (
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No exercise sets available for this topic.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

