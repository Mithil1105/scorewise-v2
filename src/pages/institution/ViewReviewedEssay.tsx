/**
 * Student View Reviewed Essay - Simple System
 * Toggle to show yellow highlights with tooltips
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEssayCorrections } from '@/hooks/useEssayCorrections';
import { renderEssayWithCorrections } from '@/utils/essayCorrections';
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  User, 
  MessageSquare,
  Star,
  Info,
  X,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

interface SubmissionData {
  id: string;
  status: string;
  submitted_at: string | null;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  assignment_id: string | null;
  isSharedEssay?: boolean;
}

interface AssignmentData {
  id: string;
  title: string;
  topic: string;
  instructions: string | null;
  image_url: string | null;
  exam_type: string;
}

export default function ViewReviewedEssay() {
  const { essayId } = useParams<{ essayId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { fetchCorrections } = useEssayCorrections();

  const [essay, setEssay] = useState<{ id: string; essay_text: string | null; exam_type: string; topic: string | null } | null>(null);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCorrections, setShowCorrections] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<{
    original: string;
    corrected: string;
    note: string | null;
  } | null>(null);

  useEffect(() => {
    if (!essayId) {
      toast({
        title: 'Invalid link',
        description: 'Essay ID is missing.',
        variant: 'destructive',
      });
      navigate('/institution/student');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch essay (only original text)
        const { data: essayData, error: essayError } = await supabase
          .from('essays')
          .select('id, essay_text, exam_type, topic')
          .eq('id', essayId)
          .maybeSingle();

        if (essayError) throw essayError;

        if (!essayData) {
          toast({
            title: 'Essay not found',
            description: 'This essay may have been deleted.',
            variant: 'destructive',
          });
          navigate('/institution/student');
          return;
        }

        setEssay(essayData);

        // Fetch corrections
        const correctionsData = await fetchCorrections(essayId);
        setCorrections(correctionsData);

        // Try to fetch submission from assignment_submissions first
        const { data: submissionData, error: submissionError } = await supabase
          .from('assignment_submissions')
          .select('id, status, submitted_at, teacher_feedback, teacher_score, reviewed_at, assignment_id')
          .eq('essay_id', essayId)
          .maybeSingle();

        if (submissionError) {
          console.error('Error fetching submission:', submissionError);
        }

        // If no assignment submission, check for shared essay review
        if (submissionData) {
          setSubmission({ ...submissionData, isSharedEssay: false });

          // Fetch assignment
          if (submissionData.assignment_id) {
            const { data: assignmentData, error: assignmentError } = await supabase
              .from('assignments')
              .select('id, title, topic, instructions, image_url, exam_type')
              .eq('id', submissionData.assignment_id)
              .maybeSingle();

            if (assignmentError) {
              console.error('Error fetching assignment:', assignmentError);
            } else if (assignmentData) {
              setAssignment(assignmentData);
            }
          }
        } else {
          // Check for shared essay review
          const { data: sharedReview, error: sharedReviewError } = await supabase
            .from('shared_essay_reviews')
            .select('id, teacher_feedback, teacher_score, reviewed_at, essay_id')
            .eq('essay_id', essayId)
            .maybeSingle();

          if (sharedReviewError) {
            console.error('Error fetching shared essay review:', sharedReviewError);
          }

          if (sharedReview) {
            // Create a mock submission object from shared essay review
            setSubmission({
              id: sharedReview.id,
              status: 'reviewed',
              submitted_at: null,
              teacher_feedback: sharedReview.teacher_feedback,
              teacher_score: sharedReview.teacher_score,
              reviewed_at: sharedReview.reviewed_at,
              assignment_id: null,
              isSharedEssay: true,
            });
          }
        }

        // If there are corrections, default to showing them
        if (correctionsData.length > 0) {
          setShowCorrections(true);
        }
      } catch (error: any) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load essay',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [essayId, navigate, toast, fetchCorrections]);

  // Handle click on correction to show details modal
  useEffect(() => {
    if (!showCorrections) return;

    const handleCorrectionClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const correctionSpan = target.closest('.essay-correction');
      if (correctionSpan) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get data from attributes (more reliable than parsing title)
        const correctedText = correctionSpan.getAttribute('data-corrected');
        const originalText = correctionSpan.getAttribute('data-original') || correctionSpan.textContent || '';
        const noteAttr = correctionSpan.getAttribute('data-note');
        const note = noteAttr && noteAttr.trim() ? noteAttr.trim() : null;
        
        if (correctedText) {
          setSelectedCorrection({
            original: originalText.trim(),
            corrected: correctedText,
            note: note,
          });
        }
      }
    };

    // Add click listener to document (works better for dynamically rendered content)
    document.addEventListener('click', handleCorrectionClick, true);
    return () => {
      document.removeEventListener('click', handleCorrectionClick, true);
    };
  }, [showCorrections, corrections]);

  if (isLoading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!essay) {
    return (
      <PageLayout>
        <TopBar />
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Essay not found</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // If no submission/review found, show essay but indicate it hasn't been reviewed
  if (!submission) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto p-6 max-w-5xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/institution/student')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold mb-2">Essay</h1>
          </div>
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">This essay has not been reviewed yet.</p>
              <p className="text-sm text-muted-foreground">{essay.topic || 'No topic'}</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  const originalText = essay.essay_text || '';
  const hasCorrections = corrections.length > 0;

  // Determine what to display
  let displayContent = '';
  if (showCorrections && hasCorrections) {
    displayContent = renderEssayWithCorrections(originalText, corrections);
  } else {
    // Plain text, no highlights - escape HTML and preserve paragraphs
    const div = document.createElement('div');
    div.textContent = originalText;
    // Convert newlines to <br> tags to preserve paragraph breaks
    displayContent = div.innerHTML.replace(/\n/g, '<br>');
  }

  const getMaxScore = (examType: string): number => {
    if (examType === 'GRE' || examType === 'IELTS-Task2') return 6;
    if (examType === 'IELTS-Task1') return 3;
    return 10;
  };

  const maxScore = getMaxScore(essay.exam_type);
  const score = submission.teacher_score;

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/institution/student')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Reviewed Essay</h1>
              {assignment && (
                <p className="text-muted-foreground">{assignment.title}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Info & Feedback */}
          <div className="space-y-6">
            {/* Assignment Info or Essay Info */}
            {assignment ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="font-medium">{assignment.title}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Badge variant="outline">{assignment.exam_type}</Badge>
                  </div>
                  {submission.submitted_at && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Submitted</Label>
                      <p className="text-sm">
                        {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                  {submission.reviewed_at && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Reviewed</Label>
                      <p className="text-sm">
                        {format(new Date(submission.reviewed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Essay Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Topic</Label>
                    <p className="font-medium">{essay.topic || 'No topic'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Badge variant="outline">{essay.exam_type}</Badge>
                    {submission.isSharedEssay && (
                      <Badge variant="secondary" className="ml-2">Shared Essay</Badge>
                    )}
                  </div>
                  {submission.reviewed_at && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Reviewed</Label>
                      <p className="text-sm">
                        {format(new Date(submission.reviewed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Score & Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Your Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {score !== null ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                      <span className="text-3xl font-bold">
                        {score} / {maxScore}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {((score / maxScore) * 100).toFixed(0)}% correct
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Not yet scored</p>
                )}
              </CardContent>
            </Card>

            {submission.teacher_feedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Teacher Comments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{submission.teacher_feedback}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Essay */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Your Essay
                    </CardTitle>
                    <CardDescription>
                      {hasCorrections
                        ? 'See what your teacher corrected'
                        : 'Your submitted essay'}
                    </CardDescription>
                  </div>

                  {hasCorrections && (
                    <div className="flex items-center gap-3">
                      <Label htmlFor="show-corrections" className="text-sm font-normal cursor-pointer">
                        Show teacher corrections
                      </Label>
                      <Switch
                        id="show-corrections"
                        checked={showCorrections}
                        onCheckedChange={setShowCorrections}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hasCorrections && showCorrections && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-2 text-sm">
                      <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                      <div className="space-y-1 text-blue-700 dark:text-blue-300">
                        <p className="font-medium">How to read corrections:</p>
                        <ul className="space-y-1 text-xs">
                          <li>
                            • <span className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">Yellow highlight</span> = 
                            Text your teacher corrected
                          </li>
                          <li>
                            • Hover or tap highlighted text to see the correction
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="min-h-[400px] p-4 border rounded-lg bg-white dark:bg-gray-900 prose prose-sm max-w-none dark:prose-invert">
                  <div 
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: displayContent }} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Correction Details Dialog */}
      <Dialog open={!!selectedCorrection} onOpenChange={(open) => !open && setSelectedCorrection(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-yellow-600" />
              Teacher Correction Details
            </DialogTitle>
            <DialogDescription>
              See what your teacher corrected and why
            </DialogDescription>
          </DialogHeader>
          
          {selectedCorrection && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Original Text (What you wrote):
                </Label>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm line-through text-red-600 dark:text-red-400">
                    {selectedCorrection.original}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Corrected Text (What it should be):
                </Label>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    {selectedCorrection.corrected}
                  </p>
                </div>
              </div>

              {selectedCorrection.note && (
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground mb-2 block">
                    Teacher's Advice:
                  </Label>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedCorrection.note}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={() => setSelectedCorrection(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

