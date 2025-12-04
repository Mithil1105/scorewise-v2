import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TopicCard } from "@/components/grammar/TopicCard";
import { ExerciseRunner } from "@/components/grammar/ExerciseRunner";
import { 
  BookOpen, 
  ClipboardList, 
  Play, 
  CheckCircle2, 
  Clock,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  PredefinedTopic, 
  GrammarTopic, 
  GrammarDailyAssignmentLog,
  GrammarManualAssignment,
  GrammarExerciseSourceType
} from "@/types/grammar";

export default function GrammarDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();
  const [loading, setLoading] = useState(true);
  
  // Today's Practice
  const [todayExercises, setTodayExercises] = useState<any[]>([]);
  const [todayAssignment, setTodayAssignment] = useState<GrammarDailyAssignmentLog | null>(null);
  const [showTodayPractice, setShowTodayPractice] = useState(false);
  
  // Manual Assignments
  const [manualAssignments, setManualAssignments] = useState<GrammarManualAssignment[]>([]);
  
  // Topics
  const [predefinedTopics, setPredefinedTopics] = useState<PredefinedTopic[]>([]);
  const [instituteTopics, setInstituteTopics] = useState<(GrammarTopic & { exercise_count?: number })[]>([]);

  // Reload institute topics when switching to institute tab
  const [activeTab, setActiveTab] = useState('predefined');
  
  useEffect(() => {
    // Wait a bit for institution context to load
    if (user) {
      const timer = setTimeout(() => {
        loadData();
      }, 500); // Give context time to restore from localStorage
      return () => clearTimeout(timer);
    }
  }, [user, activeMembership, activeInstitution]);

  useEffect(() => {
    if (activeTab === 'institute') {
      // Try loading even if activeInstitution seems null - might be loading
      if (activeInstitution) {
        loadInstituteTopics();
      } else if (activeMembership?.institution) {
        // Fallback: use institution from membership
        loadInstituteTopicsFromMembership(activeMembership.institution.id);
      }
    }
  }, [activeTab, activeInstitution, activeMembership]);

  const loadInstituteTopicsFromMembership = async (institutionId: string) => {
    try {
      console.log("Loading institute topics from membership for institution:", institutionId);
      const { data: institute, error: instituteError } = await supabase
        .from('grammar_topics')
        .select('*')
        .eq('institute_id', institutionId)
        .order('topic_name');

      if (instituteError) {
        console.error("Error loading institute topics:", instituteError);
      } else {
        console.log("Loaded institute topics:", institute?.length || 0, institute);
        if (institute) {
          // Load exercise counts for each topic
          const topicsWithCounts = await Promise.all(
            institute.map(async (topic) => {
              const { count } = await supabase
                .from('grammar_exercises')
                .select('*', { count: 'exact', head: true })
                .eq('institute_id', institutionId)
                .eq('topic_id', topic.id);
              
              return {
                ...topic,
                exercise_count: count || 0
              };
            })
          );

          // Also count exercises with no topic (general exercises)
          const { count: generalCount } = await supabase
            .from('grammar_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('institute_id', institutionId)
            .is('topic_id', null);

          setInstituteTopics(topicsWithCounts);
          
          // If there are general exercises, add a "General" topic
          if (generalCount && generalCount > 0) {
            setInstituteTopics(prev => [
              ...prev,
              {
                id: 'general',
                institute_id: institutionId,
                topic_name: 'General Exercises',
                topic_description: 'Exercises not assigned to a specific topic',
                created_by: null,
                created_at: new Date().toISOString(),
                exercise_count: generalCount
              } as GrammarTopic & { exercise_count: number }
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Exception loading institute topics:", error);
    }
  };

  const loadInstituteTopics = async () => {
    if (!activeInstitution) {
      console.log("Cannot load institute topics: no active institution");
      return;
    }

    try {
      console.log("Loading institute topics for institution:", activeInstitution.id);
      const { data: institute, error: instituteError } = await supabase
        .from('grammar_topics')
        .select('*')
        .eq('institute_id', activeInstitution.id)
        .order('topic_name');

      if (instituteError) {
        console.error("Error loading institute topics:", instituteError);
        console.error("Error details:", {
          message: instituteError.message,
          details: instituteError.details,
          hint: instituteError.hint,
          code: instituteError.code
        });
      } else {
        console.log("Loaded institute topics:", institute?.length || 0, institute);
        if (institute && institute.length > 0) {
          // Load exercise counts for each topic
          const topicsWithCounts = await Promise.all(
            institute.map(async (topic) => {
              const { count } = await supabase
                .from('grammar_exercises')
                .select('*', { count: 'exact', head: true })
                .eq('institute_id', activeInstitution.id)
                .eq('topic_id', topic.id);
              
              return {
                ...topic,
                exercise_count: count || 0
              };
            })
          );

          // Also count exercises with no topic (general exercises)
          const { count: generalCount } = await supabase
            .from('grammar_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('institute_id', activeInstitution.id)
            .is('topic_id', null);

          setInstituteTopics(topicsWithCounts);
          
          // If there are general exercises, add a "General" topic
          if (generalCount && generalCount > 0) {
            setInstituteTopics(prev => [
              ...prev,
              {
                id: 'general',
                institute_id: activeInstitution.id,
                topic_name: 'General Exercises',
                topic_description: 'Exercises not assigned to a specific topic',
                created_by: null,
                created_at: new Date().toISOString(),
                exercise_count: generalCount
              } as GrammarTopic & { exercise_count: number }
            ]);
          }
        } else {
          // Check if there are any exercises without topics
          const { count: generalCount } = await supabase
            .from('grammar_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('institute_id', activeInstitution.id)
            .is('topic_id', null);

          if (generalCount && generalCount > 0) {
            setInstituteTopics([{
              id: 'general',
              institute_id: activeInstitution.id,
              topic_name: 'General Exercises',
              topic_description: 'Exercises not assigned to a specific topic',
              created_by: null,
              created_at: new Date().toISOString(),
              exercise_count: generalCount
            } as GrammarTopic & { exercise_count: number }]);
          } else {
            setInstituteTopics([]);
          }
        }
      }
    } catch (error) {
      console.error("Exception loading institute topics:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load today's practice
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const { data: dailyLog } = await supabase
          .from('grammar_daily_assignment_log')
          .select('*')
          .eq('student_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (dailyLog) {
          setTodayAssignment(dailyLog);
          // Load exercises for today
          await loadExercisesForToday(dailyLog.exercise_ids, 'predefined');
        }

        // Load manual assignments
        if (activeInstitution) {
          const { data: assignments } = await supabase
            .from('grammar_manual_assignments')
            .select('*')
            .eq('institute_id', activeInstitution.id)
            .or(`student_ids.cs.{${user.id}},batch_ids.not.is.null`); // Simplified - should check batch membership

          if (assignments) {
            setManualAssignments(assignments);
          }
        }
      }

      // Load predefined topics
      const { data: predefined } = await supabase
        .from('predefined_topics')
        .select('*')
        .order('topic_name');

      if (predefined) {
        setPredefinedTopics(predefined);
      }

      // Load institute topics - will be loaded separately when tab is switched
      // This prevents loading issues if activeInstitution is not ready yet
      if (activeInstitution) {
        await loadInstituteTopics();
      } else if (activeMembership?.institution) {
        // Fallback: use institution from membership
        await loadInstituteTopicsFromMembership(activeMembership.institution.id);
      }
    } catch (error) {
      console.error("Error loading grammar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExercisesForToday = async (exerciseIds: string[], sourceType: GrammarExerciseSourceType) => {
    try {
      if (sourceType === 'predefined') {
        const { data } = await supabase
          .from('predefined_exercises')
          .select('*')
          .in('id', exerciseIds);

        if (data) {
          setTodayExercises(data.map(ex => ({ ...ex, use_ai_check: false })));
        }
      } else {
        const { data } = await supabase
          .from('grammar_exercises')
          .select('*')
          .in('id', exerciseIds);

        if (data) {
          setTodayExercises(data);
        }
      }
    } catch (error) {
      console.error("Error loading exercises:", error);
    }
  };

  const handleTodayPracticeComplete = async (results: Array<{ exerciseId: string; isCorrect: boolean; userAnswer: string }>) => {
    // Save attempts to database
    if (!user || !todayAssignment) return;

    try {
      const attempts = results.map(result => ({
        student_id: user.id,
        assignment_type: 'daily' as const,
        assignment_id: todayAssignment.id,
        exercise_id: result.exerciseId,
        exercise_source_type: 'predefined' as GrammarExerciseSourceType, // TODO: determine from assignment
        user_answer: result.userAnswer,
        is_correct: result.isCorrect,
        score: result.isCorrect ? 1.0 : 0.0
      }));

      const { error } = await supabase
        .from('grammar_attempts')
        .insert(attempts);

      if (error) throw error;

      setShowTodayPractice(false);
      loadData(); // Refresh to show updated status
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

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold mb-2">Grammar Practice</h1>
          <p className="text-muted-foreground">Improve your grammar skills with daily practice and assignments</p>
        </div>

        {/* Today's Practice */}
        {showTodayPractice && todayExercises.length > 0 ? (
          <div className="mb-6">
            <ExerciseRunner
              exercises={todayExercises}
              exerciseSourceType="predefined"
              assignmentType="daily"
              assignmentId={todayAssignment?.id}
              onComplete={handleTodayPracticeComplete}
              onExit={() => setShowTodayPractice(false)}
            />
          </div>
        ) : (
          <>
            {todayAssignment && (
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Today's Practice
                  </CardTitle>
                  <CardDescription>
                    Complete your daily grammar exercises
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => {
                      if (todayAssignment.exercise_ids.length > 0) {
                        loadExercisesForToday(todayAssignment.exercise_ids, 'predefined');
                        setShowTodayPractice(true);
                      }
                    }}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Today's Practice
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Manual Assignments */}
            {manualAssignments.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Assigned Exercises
                  </CardTitle>
                  <CardDescription>
                    Exercises assigned by your teacher
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {manualAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{assignment.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {assignment.exercise_ids.length} exercises
                          {assignment.due_date && (
                            <span className="ml-2">
                              • Due: {new Date(assignment.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/grammar/assignment/${assignment.id}`)}
                      >
                        Start
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Practice by Topic */}
            <Card>
              <CardHeader>
                <CardTitle>Practice by Topic</CardTitle>
                <CardDescription>
                  Choose a topic to practice grammar exercises
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="predefined">Global Topics</TabsTrigger>
                    <TabsTrigger value="institute">Institute Topics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="predefined" className="space-y-4 mt-4">
                    {predefinedTopics.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No predefined topics available
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {predefinedTopics.map((topic) => (
                          <TopicCard
                            key={topic.id}
                            id={topic.id}
                            name={topic.topic_name}
                            description={topic.topic_description}
                            topicType="predefined"
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="institute" className="space-y-4 mt-4">
                    {instituteTopics.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No institute topics available. Ask your teacher to create topics.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {instituteTopics.map((topic) => (
                          <TopicCard
                            key={topic.id}
                            id={topic.id}
                            name={topic.topic_name}
                            description={topic.topic_description}
                            topicType="institute"
                            exerciseCount={topic.exercise_count}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
}

