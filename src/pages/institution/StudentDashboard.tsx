import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { 
  GraduationCap, Building2, FileText, TrendingUp, 
  MessageSquare, BookOpen, PenTool, CheckCircle2, Clock,
  Award, Target, ArrowRight, Sparkles, Star, Calendar
} from 'lucide-react';
import { StudentAssignments } from '@/components/institution/StudentAssignments';
import { format } from 'date-fns';

interface StudentStats {
  totalEssays: number;
  avgScore: number;
  pendingAssignments: number;
  completedAssignments: number;
  recentScore?: number;
}

interface ReviewedAssignment {
  id: string;
  assignment_id: string;
  essay_id: string | null;
  assignment: {
    id: string;
    title: string;
    exam_type: string;
  };
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  status: string;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { activeMembership, activeInstitution, loading: institutionLoading } = useInstitution();
  const [stats, setStats] = useState<StudentStats>({
    totalEssays: 0,
    avgScore: 0,
    pendingAssignments: 0,
    completedAssignments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reviewedAssignments, setReviewedAssignments] = useState<ReviewedAssignment[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  useEffect(() => {
    // Wait for both loading states to complete before checking access
    if (authLoading || institutionLoading) {
      return; // Still loading, don't check yet
    }

    // Only redirect if we're sure about the state
    if (!user) {
      navigate('/auth');
      return;
    }

    // Give a small delay to allow institution context to restore from localStorage
    // This prevents race conditions where activeMembership might be null temporarily
    if (!activeMembership) {
      // Wait a bit longer - institution context might still be restoring
      const timeout = setTimeout(() => {
        if (!activeMembership) {
          navigate('/');
        }
      }, 1000); // Give 1 second for context to restore
      return () => clearTimeout(timeout);
    }

    // Only redirect if we've confirmed the user doesn't have an active membership
    if (user && (!activeMembership || activeMembership.status !== 'active')) {
      navigate('/');
      return;
    }

    // Fetch student stats and feedback
    if (user && activeMembership && activeMembership.status === 'active' && activeInstitution) {
      fetchStudentStats();
      fetchReviewedAssignments();
    }
  }, [user, activeMembership, activeInstitution, authLoading, institutionLoading, navigate]);

  const fetchStudentStats = async () => {
    if (!activeInstitution || !user || !activeMembership) return;
    
    setLoading(true);
    try {
      // Fetch essays
      const { data: essays } = await supabase
        .from('essays')
        .select('ai_score, created_at, teacher_score')
        .eq('institution_id', activeInstitution.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch assignments for this institution
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, due_date')
        .eq('institution_id', activeInstitution.id)
        .eq('is_active', true);

      // Fetch submissions for this student member
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status, teacher_score')
        .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('member_id', activeMembership.id);

      const submissionMap = new Map(submissions?.map(s => [s.assignment_id, { status: s.status, score: s.teacher_score }]));
      
      // Count pending assignments (not started or in progress)
      const pendingAssignments = assignments?.filter(a => {
        const sub = submissionMap.get(a.id);
        return !sub || sub.status === 'draft' || sub.status === 'in_progress';
      }).length || 0;

      // Count completed assignments (submitted or reviewed)
      const completedAssignments = assignments?.filter(a => {
        const sub = submissionMap.get(a.id);
        return sub && (sub.status === 'submitted' || sub.status === 'reviewed');
      }).length || 0;

      // Calculate average score from teacher scores (preferred) or AI scores
      const scoredEssays = essays?.filter(e => e.teacher_score !== null || e.ai_score !== null) || [];
      const avgScore = scoredEssays.length > 0
        ? scoredEssays.reduce((sum, e) => {
            // Prefer teacher_score, fallback to ai_score
            const score = e.teacher_score !== null ? e.teacher_score : (e.ai_score || 0);
            return sum + score;
          }, 0) / scoredEssays.length
        : 0;

      // Get most recent score (prefer teacher_score)
      const recentScore = essays && essays.length > 0 && essays[0]?.teacher_score !== null 
        ? essays[0].teacher_score 
        : (essays && essays.length > 0 ? (essays[0]?.ai_score || undefined) : undefined);

      setStats({
        totalEssays: essays?.length || 0,
        avgScore: Math.round(avgScore * 10) / 10,
        pendingAssignments,
        completedAssignments,
        recentScore: recentScore ? Math.round(recentScore * 10) / 10 : undefined,
      });
    } catch (err) {
      console.error('Error fetching student stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewedAssignments = async () => {
    if (!activeInstitution || !activeMembership) return;
    
    setLoadingFeedback(true);
    try {
      // Fetch reviewed submissions with assignment details
      // Show all reviewed assignments (with feedback or score)
      const { data: submissions, error } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          assignment_id,
          essay_id,
          teacher_feedback,
          teacher_score,
          reviewed_at,
          status,
          assignment:assignments!inner(
            id,
            title,
            exam_type
          )
        `)
        .eq('member_id', activeMembership.id)
        .eq('status', 'reviewed')
        .or('teacher_feedback.not.is.null,teacher_score.not.is.null')
        .order('reviewed_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Transform the data to match our interface
      const reviewed = (submissions || []).map((sub: any) => ({
        id: sub.id,
        assignment_id: sub.assignment_id,
        essay_id: sub.essay_id,
        assignment: sub.assignment,
        teacher_feedback: sub.teacher_feedback,
        teacher_score: sub.teacher_score,
        reviewed_at: sub.reviewed_at,
        status: sub.status,
      }));

      setReviewedAssignments(reviewed);
    } catch (err) {
      console.error('Error fetching reviewed assignments:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const getMaxScore = (examType: string): number => {
    if (examType === 'GRE' || examType === 'IELTS-Task2' || examType === 'IELTS_T2') return 6;
    if (examType === 'IELTS-Task1' || examType === 'IELTS_T1') return 3;
    return 10;
  };

  // Show loading state while checking permissions
  if (authLoading || institutionLoading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Don't render anything if we're redirecting (prevents flash of content)
  if (!user || !activeInstitution || !activeMembership || activeMembership.status !== 'active') {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Redirecting...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome, {profile?.display_name || 'Student'}! 🎓
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{activeInstitution.name}</span>
                <Badge variant="secondary" className="ml-2">Student</Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Practice your writing skills, complete assignments, and track your progress. You're doing great!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Total Essays</CardDescription>
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats.totalEssays}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalEssays > 0 ? 'Essays completed' : 'Start practicing!'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Average Score</CardDescription>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.avgScore > 0 ? 'Your average' : 'Complete essays to see scores'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Pending Assignments</CardDescription>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats.pendingAssignments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingAssignments > 0 ? 'Awaiting completion' : 'All done!'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Completed</CardDescription>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats.completedAssignments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedAssignments > 0 ? 'Assignments done' : 'Get started!'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Start practicing or check your work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate('/essay')}
              >
                <PenTool className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Practice GRE Essay</div>
                  <div className="text-xs text-muted-foreground">Start a new practice session</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate('/ielts')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">IELTS Writing</div>
                  <div className="text-xs text-muted-foreground">Task 1 & Task 2 practice</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => navigate('/institution/grading')}
              >
                <Award className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Graded Assignments</div>
                  <div className="text-xs text-muted-foreground">View teacher feedback</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => navigate('/drafts')}
              >
                <FileText className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">My Drafts</div>
                  <div className="text-xs text-muted-foreground">View saved essays</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        {stats.recentScore && (
          <Card className="mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Recent Performance
              </CardTitle>
              <CardDescription>Your latest essay score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold mb-2">{stats.recentScore.toFixed(1)}</div>
                  <p className="text-sm text-muted-foreground">
                    {stats.recentScore >= 4.0 ? 'Excellent work! 🌟' : 
                     stats.recentScore >= 3.0 ? 'Good progress! Keep it up! 💪' : 
                     'Keep practicing to improve! 📈'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Latest Score
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assignments Section */}
        <div className="mb-6">
          <StudentAssignments />
        </div>

        {/* Progress & Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                My Progress
              </CardTitle>
              <CardDescription>Track your improvement over time</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.totalEssays === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">No essays yet</p>
                  <p className="text-sm mb-4">Start practicing to see your progress</p>
                  <Button variant="outline" onClick={() => navigate('/essay')}>
                    <PenTool className="h-4 w-4 mr-2" />
                    Start Practicing
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Score</span>
                    <span className="text-lg font-bold">{stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Essays</span>
                    <span className="text-lg font-bold">{stats.totalEssays}</span>
                  </div>
                  {stats.recentScore && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Latest Score</span>
                      <span className="text-lg font-bold">{stats.recentScore.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={() => navigate('/drafts')}>
                      <FileText className="h-4 w-4 mr-2" />
                      View All Essays
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Teacher Feedback
              </CardTitle>
              <CardDescription>Messages and feedback from your instructors</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFeedback ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : reviewedAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">No feedback yet</p>
                  <p className="text-sm">Teacher feedback will appear here after your assignments are reviewed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewedAssignments.map((reviewed) => {
                    const maxScore = getMaxScore(reviewed.assignment.exam_type);
                    return (
                      <div
                        key={reviewed.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (reviewed.essay_id) {
                            navigate(`/institution/view-reviewed-essay/${reviewed.essay_id}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">
                              {reviewed.assignment.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {reviewed.assignment.exam_type}
                              </Badge>
                              {reviewed.reviewed_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(reviewed.reviewed_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          {reviewed.teacher_score !== null && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-semibold text-sm">
                                {reviewed.teacher_score} / {maxScore}
                              </span>
                            </div>
                          )}
                        </div>
                        {reviewed.teacher_feedback && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            {reviewed.teacher_feedback}
                          </p>
                        )}
                        {reviewed.essay_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/institution/view-reviewed-essay/${reviewed.essay_id}`);
                            }}
                          >
                            View Full Feedback
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {reviewedAssignments.length >= 5 && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => navigate('/institution/grading')}
                    >
                      View All Graded Assignments
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          ScoreWise for Institutes — Powered by Mithil & Hasti
        </p>
      </div>
    </PageLayout>
  );
}
