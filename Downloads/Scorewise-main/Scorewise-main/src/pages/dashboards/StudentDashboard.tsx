import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { 
  FileText, 
  BookOpen, 
  Keyboard, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  ArrowRight,
  Building2,
  Award,
  Target
} from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();

  // Placeholder data - will be replaced with real data later
  const stats = {
    essaysCompleted: 12,
    averageScore: 4.5,
    wordsWritten: 8500,
    assignmentsPending: 3
  };

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Continue your essay writing journey.
          </p>
          {activeInstitution && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                You are learning with: <span className="font-semibold text-foreground">{activeInstitution.name}</span>
              </span>
            </div>
          )}
        </div>

        {/* Continue Writing Section */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Continue Writing
            </CardTitle>
            <CardDescription>
              Resume your last essay or start a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="gap-2">
                <Link to="/essay">
                  <FileText className="h-4 w-4" />
                  Write GRE Essay
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/ielts">
                  <FileText className="h-4 w-4" />
                  Practice IELTS
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Assignments */}
        {activeMembership && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Today's Assignments
              </CardTitle>
              <CardDescription>
                Assignments from your teachers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Placeholder - will be replaced with real assignments */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Weekly Practice Essay</h3>
                      <p className="text-sm text-muted-foreground">Due: Dec 5, 2024 at 11:59 PM</p>
                    </div>
                    <Button asChild size="sm">
                      <Link to="/institution/student">View All</Link>
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">
                  {stats.assignmentsPending} assignments pending
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Snapshot */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Essays Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.essaysCompleted}</div>
              <p className="text-sm text-muted-foreground mt-1">Total essays written</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.averageScore.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground mt-1">Out of 6.0 (GRE)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Words Written
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.wordsWritten.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">Total words practiced</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>
              Jump to your favorite practice tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-start gap-3">
                <Link to="/essay" className="w-full">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Write Essay</div>
                      <div className="text-xs text-muted-foreground">GRE & IELTS practice</div>
                    </div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-start gap-3">
                <Link to="/vocabulary" className="w-full">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Vocabulary</div>
                      <div className="text-xs text-muted-foreground">500+ high-frequency words</div>
                    </div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-6 flex flex-col items-start gap-3">
                <Link to="/typing" className="w-full">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Keyboard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Typing Practice</div>
                      <div className="text-xs text-muted-foreground">Improve speed & accuracy</div>
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

