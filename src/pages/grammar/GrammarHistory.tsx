import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GrammarAttempt } from "@/types/grammar";

interface AttemptWithExercise extends GrammarAttempt {
  exercise?: {
    question: string;
    answer: string;
  };
  question?: {
    question: string;
    answer: string;
  };
  exercise_set?: {
    id: string;
    title: string;
    description: string | null;
  };
  assignment?: {
    title?: string;
  };
}

interface ExerciseSetHistory {
  exercise_set_id: string;
  exercise_set_title: string;
  exercise_set_description: string | null;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy: number;
  last_attempt_date: string | null;
  attempts: AttemptWithExercise[];
  completion?: {
    completed_at: string;
    score: number;
    total_questions: number;
    correct_answers: number;
  };
}

export default function GrammarHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AttemptWithExercise[]>([]);
  const [exerciseSetHistory, setExerciseSetHistory] = useState<ExerciseSetHistory[]>([]);
  const [viewMode, setViewMode] = useState<'exercise' | 'question'>('exercise'); // 'exercise' for exercise-wise, 'question' for question-wise
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    attempted: 0,
    notAttempted: 0
  });
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'manual' | 'self_practice'>('all');

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, activeTab]);

  const getCacheKey = () => `grammar_history_${user?.id}_${activeTab}`;
  const getCacheTimestampKey = () => `grammar_history_timestamp_${user?.id}_${activeTab}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const loadHistory = async (forceRefresh = false) => {
    if (!user) return;

    setLoading(true);
    try {
      // Check cache first
      const cacheKey = getCacheKey();
      const timestampKey = getCacheTimestampKey();
      const cachedData = localStorage.getItem(cacheKey);
      const cachedTimestamp = localStorage.getItem(timestampKey);
      
      if (!forceRefresh && cachedData && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp, 10);
        if (age < CACHE_DURATION) {
          const parsed = JSON.parse(cachedData);
          setAttempts(parsed.attempts || []);
          setExerciseSetHistory(parsed.exerciseSetHistory || []);
          setStats(parsed.stats || { total: 0, correct: 0, incorrect: 0, attempted: 0, notAttempted: 0 });
          setLoading(false);
          return;
        }
      }

      // Get the latest attempt timestamp from cache to only fetch new ones
      let lastFetchedTimestamp: string | null = null;
      if (cachedTimestamp && cachedData) {
        const cached = JSON.parse(cachedData);
        if (cached.attempts && cached.attempts.length > 0) {
          lastFetchedTimestamp = cached.attempts[0]?.submitted_at || null;
        }
      }

      let query = supabase
        .from('grammar_attempts')
        .select('*')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('assignment_type', activeTab);
      }

      // Only fetch new attempts if we have cached data
      if (lastFetchedTimestamp && !forceRefresh) {
        query = query.gt('submitted_at', lastFetchedTimestamp);
      }

      const { data: attemptsData, error } = await query;

      if (error) throw error;

      let attemptsWithExercises: AttemptWithExercise[] = [];
      
      if (attemptsData && attemptsData.length > 0) {
        // Batch fetch all exercise sets and questions at once
        const exerciseSetIds = [...new Set(attemptsData.map(a => a.exercise_set_id).filter(Boolean))];
        const questionIds = [...new Set(attemptsData.map(a => a.question_id).filter(Boolean))];
        const assignmentIds = [...new Set(attemptsData.map(a => a.assignment_id).filter(Boolean))];

        // Batch fetch exercise sets
        const exerciseSetsMap = new Map();
        if (exerciseSetIds.length > 0) {
          const { data: exerciseSets } = await supabase
            .from('grammar_exercise_sets')
            .select('id, title, description')
            .in('id', exerciseSetIds);
          exerciseSets?.forEach(es => exerciseSetsMap.set(es.id, es));
        }

        // Batch fetch questions
        const questionsMap = new Map();
        if (questionIds.length > 0) {
          const { data: questions } = await supabase
            .from('grammar_questions')
            .select('id, question, answer, exercise_set_id')
            .in('id', questionIds);
          questions?.forEach(q => questionsMap.set(q.id, q));
        }

        // Batch fetch assignments
        const assignmentsMap = new Map();
        if (assignmentIds.length > 0 && activeTab === 'manual') {
          const { data: assignments } = await supabase
            .from('grammar_manual_assignments')
            .select('id, title')
            .in('id', assignmentIds);
          assignments?.forEach(a => assignmentsMap.set(a.id, a));
        }

        // Load exercise/question details for each attempt (using batch fetched data)
        attemptsWithExercises = attemptsData.map((attempt) => {
          let exercise = null;
          let question = null;
          let exercise_set = null;
          
          // Try to load from new structure (grammar_questions) first
          if (attempt.question_id) {
            const questionData = questionsMap.get(attempt.question_id);
            if (questionData) {
              question = {
                question: questionData.question,
                answer: questionData.answer
              };
              
              // Load exercise set info
              if (questionData.exercise_set_id) {
                exercise_set = exerciseSetsMap.get(questionData.exercise_set_id) || null;
              }
            }
          }
          
          // Fallback to old structure if question_id not available (lazy load these)
          if (!question && attempt.exercise_id) {
            // These are less common, load individually if needed
            if (attempt.exercise_source_type === 'predefined') {
              // Will be loaded lazily if needed
            } else {
              // Will be loaded lazily if needed
            }
          }
          
          // Load exercise set if exercise_set_id is available but not loaded yet
          if (!exercise_set && attempt.exercise_set_id) {
            exercise_set = exerciseSetsMap.get(attempt.exercise_set_id) || null;
          }

          // Load assignment details if available
          let assignment = null;
          if (attempt.assignment_id && attempt.assignment_type === 'manual') {
            assignment = assignmentsMap.get(attempt.assignment_id) || null;
          }

          return {
            ...attempt,
            exercise,
            question,
            exercise_set,
            assignment
          } as AttemptWithExercise;
        });

        // Merge with cached data if exists
        if (cachedData && !forceRefresh) {
          const cached = JSON.parse(cachedData);
          const existingAttempts = cached.attempts || [];
          const existingIds = new Set(existingAttempts.map((a: any) => a.id));
          const newAttempts = attemptsWithExercises.filter(a => !existingIds.has(a.id));
          attemptsWithExercises = [...newAttempts, ...existingAttempts];
        }
      } else if (cachedData && !forceRefresh) {
        // No new data, use cache
        const cached = JSON.parse(cachedData);
        attemptsWithExercises = cached.attempts || [];
      }

      setAttempts(attemptsWithExercises);

      // Group by exercise_set_id for exercise-wise view
      const exerciseSetMap = new Map<string, ExerciseSetHistory>();
      
      attemptsWithExercises.forEach(attempt => {
        const exerciseSetId = attempt.exercise_set_id || 'unknown';
        const exerciseSetTitle = attempt.exercise_set?.title || 'Unknown Exercise';
        const exerciseSetDescription = attempt.exercise_set?.description || null;
        
        if (!exerciseSetMap.has(exerciseSetId)) {
          exerciseSetMap.set(exerciseSetId, {
            exercise_set_id: exerciseSetId,
            exercise_set_title: exerciseSetTitle,
            exercise_set_description: exerciseSetDescription,
            total_attempts: 0,
            correct_attempts: 0,
            incorrect_attempts: 0,
            accuracy: 0,
            last_attempt_date: null,
            attempts: [],
            completion: undefined
          });
        }
        
        const history = exerciseSetMap.get(exerciseSetId)!;
        history.attempts.push(attempt);
        history.total_attempts++;
        if (attempt.is_correct) {
          history.correct_attempts++;
        } else {
          history.incorrect_attempts++;
        }
        
        const attemptDate = new Date(attempt.submitted_at);
        if (!history.last_attempt_date || attemptDate > new Date(history.last_attempt_date)) {
          history.last_attempt_date = attempt.submitted_at;
        }
      });
      
      // Calculate accuracy for each exercise set
      exerciseSetMap.forEach(history => {
        history.accuracy = history.total_attempts > 0 
          ? Math.round((history.correct_attempts / history.total_attempts) * 100) 
          : 0;
      });
      
      // Load completion records (batch fetch)
      const exerciseSetIds = Array.from(exerciseSetMap.keys()).filter(id => id !== 'unknown');
      if (exerciseSetIds.length > 0) {
        const { data: completions } = await supabase
          .from('grammar_exercise_completions')
          .select('*')
          .eq('student_id', user.id)
          .in('exercise_set_id', exerciseSetIds);
        
        completions?.forEach(completion => {
          const history = exerciseSetMap.get(completion.exercise_set_id);
          if (history) {
            history.completion = {
              completed_at: completion.completed_at,
              score: completion.score,
              total_questions: completion.total_questions,
              correct_answers: completion.correct_answers
            };
          }
        });
      }
      
      // Convert map to array and sort by last attempt date
      const exerciseSetHistoryArray = Array.from(exerciseSetMap.values())
        .sort((a, b) => {
          if (!a.last_attempt_date) return 1;
          if (!b.last_attempt_date) return -1;
          return new Date(b.last_attempt_date).getTime() - new Date(a.last_attempt_date).getTime();
        });
      
      setExerciseSetHistory(exerciseSetHistoryArray);

      // Calculate overall statistics
      const total = attemptsWithExercises.length;
      const correct = attemptsWithExercises.filter(a => a.is_correct).length;
      const incorrect = attemptsWithExercises.filter(a => !a.is_correct).length;
      const attempted = total;
      
      const statsData = {
        total,
        correct,
        incorrect,
        attempted,
        notAttempted: 0
      };
      
      setStats(statsData);

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify({
        attempts: attemptsWithExercises,
        exerciseSetHistory: exerciseSetHistoryArray,
        stats: statsData
      }));
      localStorage.setItem(timestampKey, Date.now().toString());
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
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
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/grammar")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grammar Practice
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Grammar Exercise History</CardTitle>
            <CardDescription>
              View your grammar exercise attempts and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Attempts</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="text-2xl font-bold text-red-600">{stats.incorrect}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="manual">Assignments</TabsTrigger>
                <TabsTrigger value="self_practice">Self Practice</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {/* View Mode Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'exercise' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('exercise')}
                    >
                      Exercise-wise
                    </Button>
                    <Button
                      variant={viewMode === 'question' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('question')}
                    >
                      Question-wise
                    </Button>
                  </div>
                </div>

                {viewMode === 'exercise' ? (
                  // Exercise-wise view (grouped by exercise sets)
                  exerciseSetHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No exercise attempts found for this category.</p>
                      <Button onClick={() => navigate("/grammar")} className="mt-4">
                        Start Practicing
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {exerciseSetHistory.map((exerciseHistory) => (
                        <Card key={exerciseHistory.exercise_set_id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                  {exerciseHistory.exercise_set_title}
                                  {exerciseHistory.completion && (
                                    <Badge variant="default" className="bg-green-500">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                </CardTitle>
                                {exerciseHistory.exercise_set_description && (
                                  <CardDescription className="mt-1">
                                    {exerciseHistory.exercise_set_description}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center p-3 border rounded-lg">
                                <div className="text-lg font-bold">{exerciseHistory.total_attempts}</div>
                                <div className="text-xs text-muted-foreground">Total Attempts</div>
                              </div>
                              <div className="text-center p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                                <div className="text-lg font-bold text-green-600">{exerciseHistory.correct_attempts}</div>
                                <div className="text-xs text-muted-foreground">Correct</div>
                              </div>
                              <div className="text-center p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                                <div className="text-lg font-bold text-red-600">{exerciseHistory.incorrect_attempts}</div>
                                <div className="text-xs text-muted-foreground">Incorrect</div>
                              </div>
                              <div className="text-center p-3 border rounded-lg">
                                <div className="text-lg font-bold">{exerciseHistory.accuracy}%</div>
                                <div className="text-xs text-muted-foreground">Accuracy</div>
                              </div>
                            </div>
                            
                            {exerciseHistory.completion && (
                              <div className="mb-4 p-3 bg-muted rounded-lg">
                                <div className="text-sm font-medium mb-1">Latest Completion</div>
                                <div className="text-xs text-muted-foreground">
                                  Score: {exerciseHistory.completion.correct_answers}/{exerciseHistory.completion.total_questions} ({Math.round((exerciseHistory.completion.score / exerciseHistory.completion.total_questions) * 100)}%) • 
                                  Completed: {new Date(exerciseHistory.completion.completed_at).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                            
                            <div className="border rounded-lg">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Question</TableHead>
                                    <TableHead>Your Answer</TableHead>
                                    <TableHead>Correct Answer</TableHead>
                                    <TableHead>Result</TableHead>
                                    <TableHead>Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {exerciseHistory.attempts.map((attempt) => (
                                    <TableRow key={attempt.id}>
                                      <TableCell className="max-w-[300px]">
                                        <div className="truncate" title={attempt.question?.question || attempt.exercise?.question || 'N/A'}>
                                          {attempt.question?.question || attempt.exercise?.question || 'N/A'}
                                        </div>
                                        {attempt.assignment?.title && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {attempt.assignment.title}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="max-w-[200px] truncate" title={attempt.user_answer}>
                                          {attempt.user_answer}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="max-w-[200px] truncate" title={attempt.question?.answer || attempt.exercise?.answer || 'N/A'}>
                                          {attempt.question?.answer || attempt.exercise?.answer || 'N/A'}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {attempt.is_correct ? (
                                          <Badge variant="default" className="bg-green-500">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Correct
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive">
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Incorrect
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {new Date(attempt.submitted_at).toLocaleDateString()}
                                        <br />
                                        <span className="text-xs">
                                          {new Date(attempt.submitted_at).toLocaleTimeString()}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                ) : (
                  // Question-wise view (original flat list)
                  attempts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No attempts found for this category.</p>
                      <Button onClick={() => navigate("/grammar")} className="mt-4">
                        Start Practicing
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead>Your Answer</TableHead>
                            <TableHead>Correct Answer</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attempts.map((attempt) => (
                            <TableRow key={attempt.id}>
                              <TableCell className="max-w-[300px]">
                                <div className="truncate" title={attempt.question?.question || attempt.exercise?.question || 'N/A'}>
                                  {attempt.question?.question || attempt.exercise?.question || 'N/A'}
                                </div>
                                {attempt.exercise_set?.title && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {attempt.exercise_set.title}
                                  </div>
                                )}
                                {attempt.assignment?.title && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {attempt.assignment.title}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px] truncate" title={attempt.user_answer}>
                                  {attempt.user_answer}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px] truncate" title={attempt.question?.answer || attempt.exercise?.answer || 'N/A'}>
                                  {attempt.question?.answer || attempt.exercise?.answer || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {attempt.is_correct ? (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Correct
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Incorrect
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {attempt.assignment_type === 'daily' ? 'Daily' :
                                   attempt.assignment_type === 'manual' ? 'Assignment' :
                                   'Self Practice'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(attempt.submitted_at).toLocaleDateString()}
                                <br />
                                <span className="text-xs">
                                  {new Date(attempt.submitted_at).toLocaleTimeString()}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

