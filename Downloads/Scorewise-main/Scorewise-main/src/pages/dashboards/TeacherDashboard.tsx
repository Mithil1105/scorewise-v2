import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentManager } from "@/components/institution/AssignmentManager";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Users, 
  ClipboardList,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  Eye,
  MessageSquare,
  Loader2
} from "lucide-react";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const [activeTab, setActiveTab] = useState("assignments");
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingReviews: 0,
    activeStudents: 0,
    assignmentsRunning: 0,
    totalAssignments: 0
  });

  // Function to fetch stats
  const fetchStats = useCallback(async () => {
    if (!activeInstitution) {
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    try {
      // 1. Get assignment IDs first, then count pending reviews
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('institution_id', activeInstitution.id);

      const assignmentIds = assignments?.map(a => a.id) || [];
      let pendingReviews = 0;

      if (assignmentIds.length > 0) {
        const { count } = await supabase
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted')
          .is('teacher_score', null)
          .in('assignment_id', assignmentIds);
        pendingReviews = count || 0;
      }

      // 2. Fetch active students count
      const { count: activeStudents } = await supabase
        .from('institution_members')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', activeInstitution.id)
        .eq('role', 'student')
        .eq('status', 'active');

      // 3. Fetch assignments running (active assignments - no due date or due date in future)
      const now = new Date().toISOString();
      const { count: assignmentsRunning } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', activeInstitution.id)
        .or(`due_date.is.null,due_date.gte.${now}`);

      // 4. Fetch total assignments
      const { count: totalAssignments } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', activeInstitution.id);

      setStats({
        pendingReviews,
        activeStudents: activeStudents || 0,
        assignmentsRunning: assignmentsRunning || 0,
        totalAssignments: totalAssignments || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [activeInstitution]);

  // Fetch stats on mount and when institution changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Refresh stats when assignment dialog closes (assignment might have been created)
  useEffect(() => {
    if (!createAssignmentOpen) {
      // Small delay to ensure assignment is saved
      const timer = setTimeout(() => {
        fetchStats();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [createAssignmentOpen, fetchStats]);

  const handleCreateAssignment = () => {
    setActiveTab("assignments");
    // The AssignmentManager will handle opening the dialog via the prop
    setCreateAssignmentOpen(true);
  };

  const handleViewStudents = () => {
    setActiveTab("students");
    // Navigate to the full teacher dashboard with students tab
    window.location.href = "/institution/teacher#students";
  };

  const handleReviewEssays = () => {
    setActiveTab("reviews");
    // Navigate to the full teacher dashboard with reviews
    window.location.href = "/institution/teacher#reviews";
  };

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Manage assignments, review essays, and track student progress.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats.pendingReviews}</div>
                  <p className="text-sm text-muted-foreground mt-1">Essays to review</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Active Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats.activeStudents}</div>
                  <p className="text-sm text-muted-foreground mt-1">In your institution</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-green-500" />
                Assignments Running
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats.assignmentsRunning}</div>
                  <p className="text-sm text-muted-foreground mt-1">Currently active</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Total Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">{stats.totalAssignments}</div>
                  <p className="text-sm text-muted-foreground mt-1">All time</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button onClick={handleCreateAssignment} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Assignment
              </Button>
              <Button onClick={handleViewStudents} variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                View Students
              </Button>
              <Button onClick={handleReviewEssays} variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Review Essays
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="reviews">Review Essays</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <AssignmentManager 
              initialDialogOpen={createAssignmentOpen}
              onDialogOpenChange={setCreateAssignmentOpen}
            />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Students</CardTitle>
                <CardDescription>
                  View and manage student progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    <Button asChild variant="outline">
                      <Link to="/institution/teacher#students">
                        View all students in full dashboard →
                      </Link>
                    </Button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Reviews</CardTitle>
                <CardDescription>
                  Essays waiting for your feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    <Button asChild variant="outline">
                      <Link to="/institution/teacher#reviews">
                        View all pending reviews in full dashboard →
                      </Link>
                    </Button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}

