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
  Award, Target, ArrowRight, Sparkles
} from 'lucide-react';
import { StudentAssignments } from '@/components/institution/StudentAssignments';

interface StudentStats {
  totalEssays: number;
  avgScore: number;
  pendingAssignments: number;
  completedAssignments: number;
  recentScore?: number;
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

    // Only redirect if we've confirmed the user doesn't have an active membership
    // This prevents race conditions where activeMembership might be null temporarily
    if (user && (!activeMembership || activeMembership.status !== 'active')) {
      navigate('/');
      return;
    }

    // Fetch student stats
    if (user && activeMembership && activeMembership.status === 'active' && activeInstitution) {
      fetchStudentStats();
    }
  }, [user, activeMembership, activeInstitution, authLoading, institutionLoading, navigate]);

  const fetchStudentStats = async () => {
    if (!activeInstitution || !user) return;
    
    setLoading(true);
    try {
      // Fetch essays
      const { data: essays } = await supabase
        .from('essays')
        .select('ai_score, created_at')
        .eq('institution_id', activeInstitution.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, due_date')
        .eq('institution_id', activeInstitution.id);

      // Fetch submissions
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .in('assignment_id', assignmentIds)
        .eq('user_id', user.id);

      const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s.status]));
      
      const pendingAssignments = assignments?.filter(a => {
        const status = submissionMap.get(a.id);
        return !status || status === 'draft';
      }).length || 0;

      const completedAssignments = assignments?.filter(a => {
        const status = submissionMap.get(a.id);
        return status === 'submitted' || status === 'graded';
      }).length || 0;

      const scoredEssays = essays?.filter(e => e.ai_score !== null) || [];
      const avgScore = scoredEssays.length > 0
        ? scoredEssays.reduce((sum, e) => sum + (e.ai_score || 0), 0) / scoredEssays.length
        : 0;

      const recentScore = essays?.[0]?.ai_score || undefined;

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
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">No messages yet</p>
                <p className="text-sm">Teacher feedback will appear here</p>
              </div>
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
