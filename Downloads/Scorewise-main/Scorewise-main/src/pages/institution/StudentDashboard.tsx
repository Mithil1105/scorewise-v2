import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { 
  GraduationCap, Building2, FileText, TrendingUp, 
  MessageSquare, BookOpen, PenTool
} from 'lucide-react';
import { StudentAssignments } from '@/components/institution/StudentAssignments';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeMembership, activeInstitution, loading: institutionLoading } = useInstitution();

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
  }, [user, activeMembership, authLoading, institutionLoading, navigate]);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Student Dashboard</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{activeInstitution.name}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {activeMembership.role}
          </Badge>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/essay')}>
            <CardHeader className="pb-2">
              <PenTool className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Practice GRE Essay</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Start a new essay practice session</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/ielts')}>
            <CardHeader className="pb-2">
              <BookOpen className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">IELTS Writing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Practice Task 1 and Task 2</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/drafts')}>
            <CardHeader className="pb-2">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">My Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View saved essays and scores</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Section */}
        <div className="mb-6">
          <StudentAssignments />
        </div>

        {/* Other Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                My Scores & Progress
              </CardTitle>
              <CardDescription>Track your improvement over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Complete essays to see your progress</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/essay')}>
                  Start Practicing
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages from Teachers
              </CardTitle>
              <CardDescription>Feedback and announcements from your instructors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
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
