import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BookOpen, Building2, Users, FileText, 
  ClipboardList, Loader2, GraduationCap, FolderOpen,
  TrendingUp, CheckCircle2, Clock, AlertCircle, Sparkles, ArrowRight,
  Award
} from 'lucide-react';
import { AssignmentManager } from '@/components/institution/AssignmentManager';
import { BatchManager } from '@/components/institution/BatchManager';

interface Student {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  email?: string | null;
  essayCount?: number;
  avgScore?: number;
}

interface DashboardStats {
  totalStudents: number;
  totalEssays: number;
  totalAssignments: number;
  pendingReviews: number;
  avgScore: number;
  activeStudents: number;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { activeMembership, activeInstitution, loading: institutionLoading } = useInstitution();
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalEssays: 0,
    totalAssignments: 0,
    pendingReviews: 0,
    avgScore: 0,
    activeStudents: 0,
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

    // Give a small delay to allow institution context to restore from localStorage
    // This prevents race conditions where activeMembership might be null temporarily
    if (!activeMembership) {
      // Wait a bit longer - institution context might still be restoring
      const timeout = setTimeout(() => {
        if (!activeMembership) {
          navigate('/access-denied');
        }
      }, 1000); // Give 1 second for context to restore
      return () => clearTimeout(timeout);
    }

    // Only redirect to access denied if we've confirmed the user doesn't have access
    if (user && (!activeMembership || !['teacher', 'inst_admin'].includes(activeMembership.role) || activeMembership.status !== 'active')) {
      navigate('/access-denied');
      return;
    }

    // If we have valid access, fetch data
    if (activeMembership && ['teacher', 'inst_admin'].includes(activeMembership.role) && activeMembership.status === 'active') {
      fetchDashboardData();
    }
  }, [user, activeMembership, authLoading, institutionLoading, navigate]);

  const fetchDashboardData = async () => {
    if (!activeInstitution) return;
    
    setLoading(true);
    try {
      // Fetch students
      const { data: membersData, error } = await supabase
        .from('institution_members')
        .select('*')
        .eq('institution_id', activeInstitution.id)
        .eq('role', 'student')
        .eq('status', 'active');

      if (error) throw error;

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Fetch user emails using database function
      const emailMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        try {
          // Use RPC function to get emails from auth.users
          const { data: userEmails, error: emailError } = await supabase
            .rpc('get_user_emails', { user_ids: userIds });
          
          if (!emailError && userEmails) {
            userEmails.forEach((ue: { user_id: string; email: string }) => {
              if (ue.email) {
                emailMap.set(ue.user_id, ue.email);
              }
            });
          }
        } catch (err) {
          console.log('Could not fetch emails:', err);
        }
      }

      // Fetch essays with scores
      const { data: essays } = await supabase
        .from('essays')
        .select('user_id, ai_score, created_at')
        .eq('institution_id', activeInstitution.id)
        .in('user_id', userIds);

      // Fetch assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, status')
        .eq('institution_id', activeInstitution.id);

      // Fetch pending submissions
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('id, status')
        .eq('status', 'submitted')
        .in('assignment_id', assignments?.map(a => a.id) || []);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      const countMap = new Map<string, number>();
      const scoreMap = new Map<string, number[]>();
      
      essays?.forEach(e => {
        countMap.set(e.user_id, (countMap.get(e.user_id) || 0) + 1);
        if (e.ai_score !== null) {
          const scores = scoreMap.get(e.user_id) || [];
          scores.push(e.ai_score);
          scoreMap.set(e.user_id, scores);
        }
      });

      const enrichedStudents = (membersData || []).map(m => {
        const scores = scoreMap.get(m.user_id) || [];
        const avgScore = scores.length > 0 
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
          : 0;
        
        return {
          ...m,
          profile: profileMap.get(m.user_id),
          email: emailMap.get(m.user_id) || null,
          essayCount: countMap.get(m.user_id) || 0,
          avgScore: Math.round(avgScore * 10) / 10
        };
      }) as Student[];

      setStudents(enrichedStudents);

      // Calculate overall stats
      const totalEssays = essays?.length || 0;
      const allScores = essays?.filter(e => e.ai_score !== null).map(e => e.ai_score) || [];
      const avgScore = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
        : 0;

      setStats({
        totalStudents: enrichedStudents.length,
        totalEssays,
        totalAssignments: assignments?.length || 0,
        pendingReviews: submissions?.length || 0,
        avgScore: Math.round(avgScore * 10) / 10,
        activeStudents: enrichedStudents.filter(s => s.essayCount > 0).length,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
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
  if (!user || !activeInstitution || !activeMembership || !['teacher', 'inst_admin'].includes(activeMembership.role) || activeMembership.status !== 'active') {
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
                Welcome back, {profile?.display_name || 'Teacher'}! 👋
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{activeInstitution.name}</span>
                <Badge variant="secondary" className="ml-2 capitalize">
                  {activeMembership.role === 'inst_admin' ? 'Institution Admin' : 'Teacher'}
                </Badge>
              </div>
            </div>
            {activeMembership.role === 'inst_admin' && (
              <Button variant="outline" onClick={() => navigate('/institution/admin')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            )}
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Manage your students, create assignments, and track their progress. Everything you need is right here.
          </p>
        </div>

        {/* Comprehensive Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Total Students</CardDescription>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeStudents} active this month
              </p>
            </CardContent>
          </Card>

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
                {stats.totalEssays > 0 ? `${Math.round((stats.totalEssays / stats.totalStudents) * 10) / 10} per student` : 'No essays yet'}
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
                {stats.avgScore > 0 ? 'Across all essays' : 'No scored essays yet'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Assignments</CardDescription>
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats.totalAssignments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalAssignments > 0 ? 'Active assignments' : 'Create your first assignment'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Pending Reviews</CardDescription>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats.pendingReviews}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingReviews > 0 ? 'Awaiting your review' : 'All caught up!'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Active Students</CardDescription>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats.activeStudents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeStudents > 0 ? 'Students with essays' : 'No activity yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => {
                  const tabs = document.querySelector('[role="tablist"]');
                  const assignmentsTab = tabs?.querySelector('[value="assignments"]') as HTMLElement;
                  assignmentsTab?.click();
                }}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Create Assignment</div>
                  <div className="text-xs text-muted-foreground">Set up a new task</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => {
                  const tabs = document.querySelector('[role="tablist"]');
                  const studentsTab = tabs?.querySelector('[value="students"]') as HTMLElement;
                  studentsTab?.click();
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">View Students</div>
                  <div className="text-xs text-muted-foreground">See all enrolled students</div>
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
                  <div className="text-xs text-muted-foreground">View all graded work</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate('/institution/admin')}
                disabled={activeMembership.role !== 'inst_admin'}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Manage Institution</div>
                  <div className="text-xs text-muted-foreground">Admin settings</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Students
            </TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> Batches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <AssignmentManager />
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  My Students
                </CardTitle>
                <CardDescription>
                  View and manage all students enrolled in your institution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No students yet</h3>
                    <p className="text-sm mb-4">
                      Share your institution code with students to get started
                    </p>
                    {activeInstitution?.code && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                        <code className="font-mono font-bold">{activeInstitution.code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(activeInstitution.code);
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Essays</TableHead>
                        <TableHead>Avg Score</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={student.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {student.profile?.display_name?.charAt(0) || 'S'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {student.profile?.display_name || 'Student'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {student.email || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {student.essayCount || 0}
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.avgScore > 0 ? (
                              <Badge variant="secondary">
                                {student.avgScore.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(student.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {student.essayCount > 0 ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                New
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches">
            <BatchManager />
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-8">
          ScoreWise for Institutes — Powered by Mithil & Hasti
        </p>
      </div>
    </PageLayout>
  );
}
