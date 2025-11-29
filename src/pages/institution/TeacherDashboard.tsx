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
  ClipboardList, Loader2, GraduationCap, FolderOpen
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
  essayCount?: number;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeMembership, activeInstitution, loading: institutionLoading } = useInstitution();
  const [students, setStudents] = useState<Student[]>([]);
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

    // Only redirect to access denied if we've confirmed the user doesn't have access
    // This prevents race conditions where activeMembership might be null temporarily
    if (user && (!activeMembership || !['teacher', 'inst_admin'].includes(activeMembership.role) || activeMembership.status !== 'active')) {
      navigate('/access-denied');
      return;
    }

    // If we have valid access, fetch students
    if (activeMembership && ['teacher', 'inst_admin'].includes(activeMembership.role) && activeMembership.status === 'active') {
    fetchStudents();
    }
  }, [user, activeMembership, authLoading, institutionLoading, navigate]);

  const fetchStudents = async () => {
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

      // Fetch essay counts
      const { data: essayCounts } = await supabase
        .from('essays')
        .select('user_id')
        .eq('institution_id', activeInstitution.id)
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      const countMap = new Map<string, number>();
      essayCounts?.forEach(e => {
        countMap.set(e.user_id, (countMap.get(e.user_id) || 0) + 1);
      });

      const enrichedStudents = (membersData || []).map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
        essayCount: countMap.get(m.user_id) || 0
      })) as Student[];

      setStudents(enrichedStudents);
    } catch (err) {
      console.error('Error fetching students:', err);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{activeInstitution.name}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {activeMembership.role}
            </Badge>
            {activeMembership.role === 'inst_admin' && (
              <Button variant="outline" onClick={() => navigate('/institution/admin')}>
                Admin Panel
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>My Students</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{students.length}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Essays</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {students.reduce((sum, s) => sum + (s.essayCount || 0), 0)}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Assignments Created</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">0</span>
              <span className="text-sm text-muted-foreground">(coming soon)</span>
            </CardContent>
          </Card>
        </div>

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
                <CardDescription>Students enrolled in your institution</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No students yet</p>
                    <p className="text-sm">Share the institution code to invite students</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Essays</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
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
                          <TableCell>{student.essayCount}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(student.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" disabled>
                              View Essays
                            </Button>
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
