import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  User, 
  Star,
  Search,
  Eye,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

interface GradedSubmission {
  id: string;
  assignment_id: string;
  essay_id: string | null;
  status: string;
  submitted_at: string | null;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  assignment: {
    id: string;
    title: string;
    exam_type: string;
  };
  member: {
    user_id: string;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
  essay?: {
    id: string;
    word_count: number | null;
  } | null;
}

export default function GradingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeInstitution, activeMembership } = useInstitution();

  const [gradedSubmissions, setGradedSubmissions] = useState<GradedSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (activeInstitution && activeMembership?.status === 'active') {
      fetchGradedSubmissions();
    }
  }, [activeInstitution, activeMembership]);

  const fetchGradedSubmissions = async () => {
    if (!activeInstitution) return;

    setIsLoading(true);
    try {
      // First, get assignment IDs for this institution
      const { data: institutionAssignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("institution_id", activeInstitution.id);

      const assignmentIds = institutionAssignments?.map(a => a.id) || [];

      if (assignmentIds.length === 0) {
        setGradedSubmissions([]);
        setIsLoading(false);
        return;
      }

      // Fetch all reviewed submissions
      let query = supabase
        .from("assignment_submissions")
        .select(`
          id,
          assignment_id,
          essay_id,
          status,
          submitted_at,
          teacher_feedback,
          teacher_score,
          reviewed_at,
          member_id
        `)
        .eq("status", "reviewed")
        .not("teacher_score", "is", null)
        .in("assignment_id", assignmentIds)
        .order("reviewed_at", { ascending: false });

      // Filter by member if student
      if (activeMembership?.role === 'student') {
        query = query.eq("member_id", activeMembership.id);
      }

      const { data: submissionsData, error: submissionsError } = await query;

      if (submissionsError) throw submissionsError;

      if (!submissionsData || submissionsData.length === 0) {
        setGradedSubmissions([]);
        setIsLoading(false);
        return;
      }

      // Fetch related data separately
      const memberIds = [...new Set(submissionsData.map(s => s.member_id))];
      const assignmentIdsFromSubmissions = [...new Set(submissionsData.map(s => s.assignment_id))];
      const essayIds = submissionsData.map(s => s.essay_id).filter(Boolean) as string[];

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("id, title, exam_type")
        .in("id", assignmentIdsFromSubmissions);

      // Fetch members
      const { data: membersData } = await supabase
        .from("institution_members")
        .select("id, user_id")
        .in("id", memberIds);

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      // Fetch essays
      const { data: essaysData } = await supabase
        .from("essays")
        .select("id, word_count")
        .in("id", essayIds);

      // Create maps for quick lookup
      const assignmentMap = new Map(assignmentsData?.map(a => [a.id, a]) || []);
      const memberMap = new Map(membersData?.map(m => [m.id, m]) || []);
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const essayMap = new Map(essaysData?.map(e => [e.id, e]) || []);

      // Combine data
      const enrichedSubmissions: GradedSubmission[] = submissionsData.map(sub => {
        const assignment = assignmentMap.get(sub.assignment_id);
        const member = memberMap.get(sub.member_id);
        const profile = member ? profileMap.get(member.user_id) : null;
        const essay = sub.essay_id ? essayMap.get(sub.essay_id) : null;

        return {
          id: sub.id,
          assignment_id: sub.assignment_id,
          essay_id: sub.essay_id,
          status: sub.status,
          submitted_at: sub.submitted_at,
          teacher_feedback: sub.teacher_feedback,
          teacher_score: sub.teacher_score,
          reviewed_at: sub.reviewed_at,
          assignment: assignment ? {
            id: assignment.id,
            title: assignment.title,
            exam_type: assignment.exam_type
          } : {
            id: sub.assignment_id,
            title: "Unknown Assignment",
            exam_type: "Unknown"
          },
          member: member ? {
            user_id: member.user_id,
            profile: profile || null
          } : null,
          essay: essay || null
        };
      });

      setGradedSubmissions(enrichedSubmissions);
    } catch (err: any) {
      console.error("Failed to fetch graded submissions:", err);
      toast({
        title: "Error loading graded assignments",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubmissions = gradedSubmissions.filter(sub => {
    const matchesSearch = 
      !searchTerm ||
      sub.assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.member?.profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.teacher_feedback?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "ielts-t1" && (sub.assignment.exam_type === "IELTS-Task1" || sub.assignment.exam_type === "IELTS_T1")) ||
      (filterType === "ielts-t2" && (sub.assignment.exam_type === "IELTS-Task2" || sub.assignment.exam_type === "IELTS_T2")) ||
      (filterType === "gre" && sub.assignment.exam_type === "GRE");
    
    return matchesSearch && matchesFilter;
  });

  const getMaxScore = (examType: string): number => {
    // Handle both formats: IELTS-Task1/IELTS-Task2 and IELTS_T1/IELTS_T2
    if (examType === 'GRE' || examType === 'IELTS-Task2' || examType === 'IELTS_T2') return 6;
    if (examType === 'IELTS-Task1' || examType === 'IELTS_T1') return 3;
    return 10;
  };

  const getScoreColor = (score: number, maxScore: number): string => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
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
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2 mb-4"
            onClick={() => {
              if (activeMembership?.role === 'teacher') {
                navigate("/institution/teacher");
              } else if (activeMembership?.role === 'student') {
                navigate("/institution/student");
              } else {
                navigate("/institution/admin");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
                Graded Assignments
              </h1>
              <p className="text-muted-foreground">
                View all reviewed and graded assignments
              </p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'submission' : 'submissions'}
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by assignment, student, or feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="filter">Filter by Type</Label>
                <select
                  id="filter"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Types</option>
                  <option value="ielts-t1">IELTS Task 1</option>
                  <option value="ielts-t2">IELTS Task 2</option>
                  <option value="gre">GRE</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graded Submissions Table */}
        {filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Graded Assignments</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterType !== "all"
                  ? "No assignments match your search criteria."
                  : "No assignments have been graded yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Graded Submissions</CardTitle>
              <CardDescription>
                All reviewed assignments with scores and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => {
                    const maxScore = getMaxScore(submission.assignment.exam_type);
                    const scoreColor = submission.teacher_score 
                      ? getScoreColor(submission.teacher_score, maxScore)
                      : "";
                    
                    return (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {submission.member?.profile?.display_name || "Unknown Student"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{submission.assignment.title}</div>
                          {submission.teacher_feedback && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {submission.teacher_feedback.substring(0, 50)}...
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {submission.assignment.exam_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.teacher_score !== null ? (
                            <div className="flex items-center gap-2">
                              <Star className={`h-4 w-4 ${scoreColor} fill-current`} />
                              <span className={`font-semibold ${scoreColor}`}>
                                {submission.teacher_score} / {maxScore}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.essay?.word_count ? (
                            <span className="text-sm">{submission.essay.word_count}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.reviewed_at ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(submission.reviewed_at), "MMM d, yyyy")}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.essay_id ? (
                            <div className="flex items-center gap-2">
                              {activeMembership?.role === 'student' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/institution/view-reviewed-essay/${submission.essay_id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/institution/review-essay/${submission.essay_id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No essay</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}

