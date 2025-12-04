import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GrammarAttempt } from "@/types/grammar";

interface AttemptWithExercise extends GrammarAttempt {
  exercise?: {
    question: string;
    answer: string;
  };
  assignment?: {
    title?: string;
  };
}

export default function GrammarHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AttemptWithExercise[]>([]);
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

  const loadHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('grammar_attempts')
        .select('*')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('assignment_type', activeTab);
      }

      const { data: attemptsData, error } = await query;

      if (error) throw error;

      if (attemptsData) {
        // Load exercise details for each attempt
        const attemptsWithExercises = await Promise.all(
          attemptsData.map(async (attempt) => {
            let exercise = null;
            
            if (attempt.exercise_source_type === 'predefined') {
              const { data } = await supabase
                .from('predefined_exercises')
                .select('question, answer')
                .eq('id', attempt.exercise_id)
                .single();
              exercise = data;
            } else {
              const { data } = await supabase
                .from('grammar_exercises')
                .select('question, answer')
                .eq('id', attempt.exercise_id)
                .single();
              exercise = data;
            }

            // Load assignment details if available
            let assignment = null;
            if (attempt.assignment_id && attempt.assignment_type === 'manual') {
              const { data } = await supabase
                .from('grammar_manual_assignments')
                .select('title')
                .eq('id', attempt.assignment_id)
                .single();
              assignment = data;
            }

            return {
              ...attempt,
              exercise,
              assignment
            } as AttemptWithExercise;
          })
        );

        setAttempts(attemptsWithExercises);

        // Calculate statistics
        const total = attemptsWithExercises.length;
        const correct = attemptsWithExercises.filter(a => a.is_correct).length;
        const incorrect = attemptsWithExercises.filter(a => !a.is_correct).length;
        const attempted = total;
        
        setStats({
          total,
          correct,
          incorrect,
          attempted,
          notAttempted: 0 // We only show attempted exercises here
        });
      }
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
                {attempts.length === 0 ? (
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
                              <div className="truncate" title={attempt.exercise?.question || 'N/A'}>
                                {attempt.exercise?.question || 'N/A'}
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
                              <div className="max-w-[200px] truncate" title={attempt.exercise?.answer || 'N/A'}>
                                {attempt.exercise?.answer || 'N/A'}
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
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

