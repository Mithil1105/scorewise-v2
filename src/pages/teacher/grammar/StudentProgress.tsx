import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Search, Eye, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentProgress {
  student_id: string;
  student_name: string;
  student_email: string;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy: number;
  last_attempt_date: string | null;
}

interface StudentAttempt {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  assignment_type: string;
  assignment_title?: string;
  submitted_at: string;
}

export default function StudentProgress() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<StudentAttempt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (activeInstitution) {
      loadStudentProgress();
    }
  }, [activeInstitution]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentAttempts(selectedStudent);
    }
  }, [selectedStudent]);

  const loadStudentProgress = async () => {
    if (!activeInstitution) return;

    setLoading(true);
    try {
      // Get all students in the institution
      const { data: members, error: membersError } = await supabase
        .from('institution_members')
        .select('user_id, profiles:user_id(email, full_name)')
        .eq('institution_id', activeInstitution.id)
        .eq('status', 'active')
        .in('role', ['student']);

      if (membersError) throw membersError;

      if (!members) return;

      // Get attempts for all students
      const studentIds = members.map(m => m.user_id);
      const { data: attempts, error: attemptsError } = await supabase
        .from('grammar_attempts')
        .select('student_id, is_correct, submitted_at')
        .in('student_id', studentIds);

      if (attemptsError) throw attemptsError;

      // Calculate statistics per student
      const progressMap = new Map<string, StudentProgress>();

      members.forEach(member => {
        const memberAttempts = attempts?.filter(a => a.student_id === member.user_id) || [];
        const total = memberAttempts.length;
        const correct = memberAttempts.filter(a => a.is_correct).length;
        const incorrect = total - correct;
        const accuracy = total > 0 ? (correct / total) * 100 : 0;
        const lastAttempt = memberAttempts.length > 0
          ? memberAttempts.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0].submitted_at
          : null;

        progressMap.set(member.user_id, {
          student_id: member.user_id,
          student_name: (member.profiles as any)?.full_name || 'Unknown',
          student_email: (member.profiles as any)?.email || '',
          total_attempts: total,
          correct_attempts: correct,
          incorrect_attempts: incorrect,
          accuracy,
          last_attempt_date: lastAttempt
        });
      });

      setStudents(Array.from(progressMap.values()).sort((a, b) => b.total_attempts - a.total_attempts));
    } catch (error: any) {
      console.error("Error loading student progress:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load student progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentAttempts = async (studentId: string) => {
    try {
      const { data: attempts, error } = await supabase
        .from('grammar_attempts')
        .select('*, profiles:student_id(email, full_name)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (attempts) {
        const attemptsWithDetails = await Promise.all(
          attempts.map(async (attempt: any) => {
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

            let assignmentTitle = null;
            if (attempt.assignment_id && attempt.assignment_type === 'manual') {
              const { data } = await supabase
                .from('grammar_manual_assignments')
                .select('title')
                .eq('id', attempt.assignment_id)
                .single();
              assignmentTitle = data?.title;
            }

            return {
              id: attempt.id,
              student_id: attempt.student_id,
              student_name: attempt.profiles?.full_name || 'Unknown',
              student_email: attempt.profiles?.email || '',
              question: exercise?.question || 'N/A',
              user_answer: attempt.user_answer,
              correct_answer: exercise?.answer || 'N/A',
              is_correct: attempt.is_correct,
              assignment_type: attempt.assignment_type,
              assignment_title: assignmentTitle,
              submitted_at: attempt.submitted_at
            };
          })
        );

        setStudentAttempts(attemptsWithDetails);
        setShowDetails(true);
      }
    } catch (error: any) {
      console.error("Error loading student attempts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load student attempts",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          onClick={() => navigate("/teacher/grammar")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grammar Dashboard
        </Button>

        {!showDetails ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Grammar Progress</CardTitle>
                  <CardDescription>
                    View grammar exercise progress for all students in your institution
                  </CardDescription>
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No students found.</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Total Attempts</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Incorrect</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Last Attempt</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.student_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{student.student_name}</div>
                              <div className="text-sm text-muted-foreground">{student.student_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{student.total_attempts}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-500">
                              {student.correct_attempts}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {student.incorrect_attempts}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={student.accuracy >= 70 ? "default" : student.accuracy >= 50 ? "secondary" : "destructive"}>
                              {student.accuracy.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {student.last_attempt_date
                              ? new Date(student.last_attempt_date).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStudent(student.student_id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Attempt Details</CardTitle>
                  <CardDescription>
                    Detailed view of grammar exercise attempts
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedStudent(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to List
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {studentAttempts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No attempts found for this student.</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Student Answer</TableHead>
                        <TableHead>Correct Answer</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="max-w-[300px]">
                            <div className="truncate" title={attempt.question}>
                              {attempt.question}
                            </div>
                            {attempt.assignment_title && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {attempt.assignment_title}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={attempt.user_answer}>
                              {attempt.user_answer}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={attempt.correct_answer}>
                              {attempt.correct_answer}
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
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}

