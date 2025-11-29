import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle2, FileText, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { computeDiff, DiffSegment } from '@/utils/textDiff';

interface EssayData {
  id: string;
  topic: string;
  essay_text: string | null;
  exam_type: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface SubmissionData {
  id: string;
  status: string;
  submitted_at: string | null;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  essay_id: string;
  assignment_id: string;
}

interface AssignmentData {
  id: string;
  title: string;
  topic: string;
  exam_type: string;
}

function renderDiffSegments(segments: DiffSegment[]) {
  return segments.map((segment, idx) => {
    if (segment.type === 'added') {
      return (
        <span key={idx} className="bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
          {segment.text}
        </span>
      );
    } else if (segment.type === 'removed') {
      return (
        <span key={idx} className="line-through text-muted-foreground opacity-60">
          {segment.text}
        </span>
      );
    } else {
      return <span key={idx}>{segment.text}</span>;
    }
  });
}

export default function ViewReviewedEssay() {
  const { essayId } = useParams<{ essayId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeMembership } = useInstitution();

  const [essay, setEssay] = useState<EssayData | null>(null);
  const [originalEssay, setOriginalEssay] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!essayId) {
        toast({
          title: "Invalid link",
          description: "Essay ID is missing.",
          variant: "destructive",
        });
        navigate("/student/dashboard");
        return;
      }

      try {
        // Fetch essay
        const { data: essayData, error: essayError } = await supabase
          .from("essays")
          .select("id, topic, essay_text, exam_type, word_count, created_at, updated_at, original_text")
          .eq("id", essayId)
          .maybeSingle();

        if (essayError) throw essayError;

        if (!essayData) {
          toast({
            title: "Essay not found",
            description: "This essay may have been deleted.",
            variant: "destructive",
          });
          navigate("/student/dashboard");
          return;
        }

        setEssay(essayData);
        
        // Check if there's an original_text field (teacher's edits)
        // If not, we'll need to fetch from assignment_submissions history
        const originalText = (essayData as any).original_text || null;
        setOriginalEssay(originalText);

        // Fetch submission data
        const { data: submissionData, error: submissionError } = await supabase
          .from("assignment_submissions")
          .select(`
            id,
            status,
            submitted_at,
            teacher_feedback,
            teacher_score,
            reviewed_at,
            essay_id,
            assignment_id,
            original_essay_text
          `)
          .eq("essay_id", essayId)
          .maybeSingle();

        if (submissionError) throw submissionError;

        if (submissionData) {
          setSubmission(submissionData);
          
          // Use original_essay_text from submission if available
          if ((submissionData as any).original_essay_text && !originalText) {
            setOriginalEssay((submissionData as any).original_essay_text);
          }

          // Fetch assignment details
          const { data: assignmentData, error: assignmentError } = await supabase
            .from("assignments")
            .select("id, title, topic, exam_type")
            .eq("id", submissionData.assignment_id)
            .maybeSingle();

          if (assignmentError) throw assignmentError;
          if (assignmentData) {
            setAssignment(assignmentData);
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        toast({
          title: "Error loading essay",
          description: err.message || "Please try again later.",
          variant: "destructive",
        });
        navigate("/student/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [essayId, navigate, toast]);

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

  if (!essay || !submission) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Essay not found or not reviewed yet.</p>
              <Button onClick={() => navigate("/student/dashboard")} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const hasTeacherEdits = originalEssay && originalEssay !== essay.essay_text;
  const diffSegments = hasTeacherEdits && originalEssay 
    ? computeDiff(originalEssay, essay.essay_text || '')
    : null;

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/student/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {assignment?.title || 'Reviewed Essay'}
                </CardTitle>
                <CardDescription>
                  Your essay has been reviewed by your teacher
                </CardDescription>
              </div>
              {submission.teacher_score !== null && (
                <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                  <Award className="h-4 w-4 mr-2" />
                  Score: {submission.teacher_score}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assignment Info */}
            {assignment && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Assignment Topic:</p>
                <p className="text-sm text-muted-foreground">{assignment.topic}</p>
              </div>
            )}

            {/* Teacher Feedback */}
            {submission.teacher_feedback && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Teacher Feedback</h3>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {submission.teacher_feedback}
                </p>
              </div>
            )}

            {/* Essay with Teacher Edits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Your Essay</h3>
                {hasTeacherEdits && (
                  <Badge variant="outline" className="text-xs">
                    Teacher made edits (highlighted below)
                  </Badge>
                )}
              </div>
              
              {hasTeacherEdits && diffSegments ? (
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {renderDiffSegments(diffSegments)}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      <p className="mb-2"><strong>Legend:</strong></p>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className="bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">Added by teacher</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="line-through opacity-60">Removed by teacher</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {essay.essay_text || 'No essay text available.'}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Word Count</p>
                <p className="text-lg font-semibold">{essay.word_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reviewed At</p>
                <p className="text-sm font-medium">
                  {submission.reviewed_at 
                    ? new Date(submission.reviewed_at).toLocaleDateString()
                    : 'Not reviewed'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

