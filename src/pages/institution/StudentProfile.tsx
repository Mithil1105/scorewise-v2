import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  GraduationCap,
  FileText,
  Award,
  Star,
  Calendar,
  Loader2,
  Eye,
  TrendingUp,
  BookOpen,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';

interface AssignmentSubmission {
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
    created_at: string;
  };
}

interface SharedEssayReview {
  id: string;
  essay_id: string;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  essay: {
    id: string;
    topic: string | null;
    exam_type: string;
    created_at: string;
  };
}

interface StudentProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string | null;
}

export default function StudentProfile() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeInstitution, activeMembership, loading: institutionLoading } = useInstitution();
  const { toast } = useToast();

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [sharedEssayReviews, setSharedEssayReviews] = useState<SharedEssayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberInfo, setMemberInfo] = useState<{ id: string; user_id: string; created_at: string } | null>(null);

  useEffect(() => {
    if (authLoading || institutionLoading) return;

    if (!user || !activeInstitution) {
      navigate('/access-denied');
      return;
    }

    // Check if user is teacher or inst_admin
    if (!activeMembership || !['teacher', 'inst_admin'].includes(activeMembership.role)) {
      navigate('/access-denied');
      return;
    }

    if (memberId) {
      fetchStudentData();
    }
  }, [memberId, user, activeInstitution, activeMembership, authLoading, institutionLoading, navigate]);

  const fetchStudentData = async () => {
    if (!memberId || !activeInstitution) return;

    setLoading(true);
    try {
      // Fetch member info
      const { data: memberData, error: memberError } = await supabase
        .from('institution_members')
        .select('id, user_id, created_at, status')
        .eq('id', memberId)
        .eq('institution_id', activeInstitution.id)
        .eq('role', 'student')
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData) {
        toast({
          title: 'Student not found',
          description: 'This student may not exist or may not be in your institution.',
          variant: 'destructive',
        });
        navigate(-1);
        return;
      }

      setMemberInfo(memberData);

      // Fetch student profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', memberData.user_id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fetch email using the get_user_emails function
      let email: string | null = null;
      try {
        const { data: emailData, error: emailError } = await supabase
          .rpc('get_user_emails', { user_ids: [memberData.user_id] });
        
        if (!emailError && emailData && emailData.length > 0) {
          email = emailData[0].email || null;
        }
      } catch (e) {
        console.log('Could not fetch email:', e);
      }

      setStudentProfile({
        user_id: memberData.user_id,
        display_name: profileData?.display_name || null,
        avatar_url: profileData?.avatar_url || null,
        email: email,
      });

      // Fetch all assignment submissions for this student
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          assignment_id,
          essay_id,
          status,
          submitted_at,
          teacher_feedback,
          teacher_score,
          reviewed_at,
          assignment:assignments!inner(
            id,
            title,
            exam_type,
            created_at
          )
        `)
        .eq('member_id', memberId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      setAssignmentSubmissions((submissionsData || []) as AssignmentSubmission[]);

      // Fetch all shared essay reviews for this student
      const { data: sharedReviewsData, error: sharedReviewsError } = await supabase
        .from('shared_essay_reviews')
        .select(`
          id,
          essay_id,
          teacher_feedback,
          teacher_score,
          reviewed_at,
          essay:essays!inner(
            id,
            topic,
            exam_type,
            created_at,
            user_id
          )
        `)
        .eq('essay.user_id', memberData.user_id)
        .order('reviewed_at', { ascending: false });

      if (sharedReviewsError) throw sharedReviewsError;

      setSharedEssayReviews((sharedReviewsData || []) as SharedEssayReview[]);
    } catch (err: any) {
      console.error('Error fetching student data:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load student data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getMaxScore = (examType: string): number => {
    if (examType === 'IELTS-Task1' || examType === 'IELTS_T1') return 3;
    if (examType === 'IELTS-Task2' || examType === 'IELTS_T2' || examType === 'GRE') return 6;
    return 10;
  };

  const calculateAverageScore = (): number => {
    const allScores: number[] = [];

    assignmentSubmissions.forEach(sub => {
      if (sub.teacher_score !== null) {
        allScores.push(sub.teacher_score);
      }
    });

    sharedEssayReviews.forEach(review => {
      if (review.teacher_score !== null) {
        allScores.push(review.teacher_score);
      }
    });

    if (allScores.length === 0) return 0;
    const sum = allScores.reduce((a, b) => a + b, 0);
    return sum / allScores.length;
  };

  const getInitials = () => {
    if (studentProfile?.display_name) {
      return studentProfile.display_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'S';
  };

  if (loading || authLoading || institutionLoading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!studentProfile || !memberInfo) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Student not found</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const avgScore = calculateAverageScore();
  const totalSubmissions = assignmentSubmissions.length;
  const reviewedSubmissions = assignmentSubmissions.filter(s => s.status === 'reviewed').length;
  const totalSharedEssays = sharedEssayReviews.length;

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={studentProfile.avatar_url || undefined} />
              <AvatarFallback className="text-xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">
                {studentProfile.display_name || 'Student'}
              </h1>
              <p className="text-muted-foreground">
                {studentProfile.email || 'Email not available'}
              </p>
              {memberInfo && (
                <p className="text-sm text-muted-foreground mt-1">
                  Joined: {format(new Date(memberInfo.created_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{avgScore.toFixed(1)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                  <p className="text-2xl font-bold">{totalSubmissions}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
                  <p className="text-2xl font-bold">{reviewedSubmissions}</p>
                </div>
                <Award className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shared Essays</p>
                  <p className="text-2xl font-bold">{totalSharedEssays}</p>
                </div>
                <Share2 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assignments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assignments">
              <FileText className="h-4 w-4 mr-2" />
              Assignment Submissions ({totalSubmissions})
            </TabsTrigger>
            <TabsTrigger value="shared">
              <Share2 className="h-4 w-4 mr-2" />
              Shared Essays ({totalSharedEssays})
            </TabsTrigger>
            <TabsTrigger value="grades">
              <Award className="h-4 w-4 mr-2" />
              All Grades
            </TabsTrigger>
          </TabsList>

          {/* Assignment Submissions Tab */}
          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>Assignment Submissions</CardTitle>
                <CardDescription>
                  All assignments submitted by this student
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignmentSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No assignment submissions yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentSubmissions.map((submission) => {
                        const maxScore = getMaxScore(submission.assignment.exam_type);
                        return (
                          <TableRow key={submission.id}>
                            <TableCell className="font-medium">
                              {submission.assignment.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {submission.assignment.exam_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {submission.submitted_at ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not submitted</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  submission.status === 'reviewed'
                                    ? 'default'
                                    : submission.status === 'submitted'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {submission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {submission.teacher_score !== null ? (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="font-semibold">
                                    {submission.teacher_score} / {maxScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {submission.essay_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (submission.status === 'reviewed') {
                                      navigate(`/institution/view-reviewed-essay/${submission.essay_id}`);
                                    } else {
                                      navigate(`/institution/review-essay/${submission.essay_id}`);
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {submission.status === 'reviewed' ? 'View' : 'Review'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shared Essays Tab */}
          <TabsContent value="shared">
            <Card>
              <CardHeader>
                <CardTitle>Shared Essays</CardTitle>
                <CardDescription>
                  Essays shared by this student for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sharedEssayReviews.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Share2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No shared essays reviewed yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sharedEssayReviews.map((review) => {
                        const maxScore = getMaxScore(review.essay.exam_type);
                        return (
                          <TableRow key={review.id}>
                            <TableCell className="font-medium">
                              {review.essay.topic || 'Untitled Essay'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {review.essay.exam_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {review.reviewed_at ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(review.reviewed_at), 'MMM d, yyyy')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not reviewed</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {review.teacher_score !== null ? (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="font-semibold">
                                    {review.teacher_score} / {maxScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigate(`/institution/review-shared-essay/${review.essay_id}`);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Grades Tab */}
          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle>Complete Grade History</CardTitle>
                <CardDescription>
                  All grades received by this student across all assignments and shared essays
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignmentSubmissions.filter(s => s.teacher_score !== null).length === 0 &&
                sharedEssayReviews.filter(r => r.teacher_score !== null).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No grades yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Exam Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Assignment submissions with grades */}
                      {assignmentSubmissions
                        .filter(s => s.teacher_score !== null)
                        .map((submission) => {
                          const maxScore = getMaxScore(submission.assignment.exam_type);
                          return (
                            <TableRow key={`assignment-${submission.id}`}>
                              <TableCell>
                                <Badge variant="secondary">Assignment</Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {submission.assignment.title}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {submission.assignment.exam_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="font-semibold">
                                    {submission.teacher_score} / {maxScore}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {submission.reviewed_at ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(submission.reviewed_at), 'MMM d, yyyy')}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {submission.teacher_feedback ? (
                                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                                    {submission.teacher_feedback}
                                  </p>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}

                      {/* Shared essay reviews with grades */}
                      {sharedEssayReviews
                        .filter(r => r.teacher_score !== null)
                        .map((review) => {
                          const maxScore = getMaxScore(review.essay.exam_type);
                          return (
                            <TableRow key={`shared-${review.id}`}>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                  Shared Essay
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {review.essay.topic || 'Untitled Essay'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {review.essay.exam_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="font-semibold">
                                    {review.teacher_score} / {maxScore}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {review.reviewed_at ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(review.reviewed_at), 'MMM d, yyyy')}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {review.teacher_feedback ? (
                                  <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                                    {review.teacher_feedback}
                                  </p>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}

