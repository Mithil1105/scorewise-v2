/**
 * Teacher Shared Essay Review Page
 * Review essays shared by students (not assignment submissions)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { supabase } from '@/integrations/supabase/client';
import { SimpleEssayReview } from '@/components/essay/SimpleEssayReview';
import { useEssayCorrections } from '@/hooks/useEssayCorrections';
import { EssayCorrection } from '@/utils/essayCorrections';
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  User, 
  Calendar,
  Star,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

interface EssayData {
  id: string;
  essay_text: string | null;
  exam_type: string;
  topic: string | null;
  created_at: string;
  user_id: string;
  institution_member_id: string | null;
  member?: {
    user_id: string;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

interface SharedEssayReview {
  id: string;
  essay_id: string;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export default function ReviewSharedEssay() {
  const { essayId } = useParams<{ essayId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();
  const {
    loading: correctionsLoading,
    fetchCorrections,
    addCorrection,
    updateCorrection,
    deleteCorrection,
  } = useEssayCorrections();

  const [essay, setEssay] = useState<EssayData | null>(null);
  const [review, setReview] = useState<SharedEssayReview | null>(null);
  const [corrections, setCorrections] = useState<EssayCorrection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // Feedback state
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [teacherScore, setTeacherScore] = useState<string>('');

  useEffect(() => {
    if (!essayId || !activeInstitution || !activeMembership) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch essay
        const { data: essayData, error: essayError } = await supabase
          .from('essays')
          .select('id, essay_text, exam_type, topic, created_at, user_id, institution_member_id')
          .eq('id', essayId)
          .eq('shared_with_teacher', true)
          .maybeSingle();

        if (essayError) throw essayError;

        if (!essayData) {
          toast({
            title: 'Essay not found',
            description: 'This essay may have been deleted or is not shared.',
            variant: 'destructive',
          });
          navigate('/institution/teacher');
          return;
        }

        // Fetch member and profile if available
        let memberData = null;
        let profileData = null;
        
        if (essayData.institution_member_id) {
          const { data: member } = await supabase
            .from('institution_members')
            .select('id, user_id')
            .eq('id', essayData.institution_member_id)
            .maybeSingle();

          if (member) {
            memberData = member;
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .eq('user_id', member.user_id)
              .maybeSingle();
            profileData = profile;
          }
        } else if (essayData.user_id) {
          // Fallback to user_id if no member_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', essayData.user_id)
            .maybeSingle();
          profileData = profile;
        }

        const enrichedEssay = {
          ...essayData,
          member: memberData ? {
            user_id: memberData.user_id,
            profile: profileData
          } : profileData ? {
            user_id: essayData.user_id,
            profile: profileData
          } : null
        };

        setEssay(enrichedEssay);

        // Fetch corrections
        const correctionsData = await fetchCorrections(essayId);
        setCorrections(correctionsData);

        // Fetch or create review
        const { data: reviewData, error: reviewError } = await supabase
          .from('shared_essay_reviews')
          .select('id, essay_id, teacher_feedback, teacher_score, reviewed_at, reviewed_by')
          .eq('essay_id', essayId)
          .maybeSingle();

        if (reviewError && reviewError.code !== 'PGRST116') {
          throw reviewError;
        }

        if (reviewData) {
          setReview(reviewData);
          setTeacherFeedback(reviewData.teacher_feedback || '');
          setTeacherScore(reviewData.teacher_score?.toString() || '');
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
  }, [essayId, activeInstitution, activeMembership, navigate, toast, fetchCorrections]);

  const handleAddCorrection = async (
    startIndex: number,
    endIndex: number,
    originalText: string,
    correctedText: string,
    note?: string
  ) => {
    if (!essayId) return;

    const correction = await addCorrection({
      essay_id: essayId,
      start_index: startIndex,
      end_index: endIndex,
      original_text: originalText,
      corrected_text: correctedText,
      teacher_note: note,
    });

    if (correction) {
      const updated = await fetchCorrections(essayId);
      setCorrections(updated);
    }
  };

  const handleEditCorrection = async (
    id: string,
    correctedText: string,
    note?: string
  ) => {
    const correction = await updateCorrection(id, { corrected_text: correctedText, teacher_note: note });
    if (correction && essayId) {
      const updated = await fetchCorrections(essayId);
      setCorrections(updated);
    }
  };

  const handleDeleteCorrection = async (id: string) => {
    const success = await deleteCorrection(id);
    if (success && essayId) {
      const updated = await fetchCorrections(essayId);
      setCorrections(updated);
    }
  };

  const handleSaveFeedback = async () => {
    if (!essayId) return;

    // Validate score
    if (teacherScore.trim()) {
      const scoreNum = parseFloat(teacherScore);
      let maxScore = 10;
      if (essay?.exam_type === 'GRE' || essay?.exam_type === 'IELTS-Task2') {
        maxScore = 6;
      } else if (essay?.exam_type === 'IELTS-Task1') {
        maxScore = 3;
      }

      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) {
        toast({
          title: 'Invalid score',
          description: `Score must be between 0 and ${maxScore}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSavingFeedback(true);
    try {
      const scoreValue = teacherScore.trim() ? parseFloat(teacherScore) : null;

      if (review) {
        // Update existing review
        const { error } = await supabase
          .from('shared_essay_reviews')
          .update({
            teacher_feedback: teacherFeedback.trim() || null,
            teacher_score: scoreValue,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id || null,
          })
          .eq('id', review.id);

        if (error) throw error;
      } else {
        // Create new review
        const { data: newReview, error } = await supabase
          .from('shared_essay_reviews')
          .insert({
            essay_id: essayId,
            teacher_feedback: teacherFeedback.trim() || null,
            teacher_score: scoreValue,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;
        if (newReview) setReview(newReview);
      }

      toast({
        title: 'Feedback saved',
        description: 'Your feedback has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save feedback',
        variant: 'destructive',
      });
    } finally {
      setIsSavingFeedback(false);
    }
  };

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

  const originalText = essay.essay_text || '';

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/institution/teacher')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Review Shared Essay</h1>
              {essay.topic && (
                <p className="text-muted-foreground">{essay.topic}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Student Info & Feedback */}
          <div className="space-y-6">
            {/* Student Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Student Name</Label>
                  <p className="font-medium">
                    {essay.member?.profile?.display_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Badge variant="outline">{essay.exam_type}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Shared</Label>
                  <p className="text-sm">
                    {format(new Date(essay.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Teacher Feedback
                </CardTitle>
                <CardDescription>
                  Add comments and score for the student
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="score">Score</Label>
                  <Input
                    id="score"
                    type="number"
                    value={teacherScore}
                    onChange={(e) => setTeacherScore(e.target.value)}
                    placeholder="Enter score"
                    min="0"
                    max={
                      essay.exam_type === 'IELTS-Task1' ? 3 :
                      essay.exam_type === 'IELTS-Task2' || essay.exam_type === 'GRE' ? 6 : 10
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max score:{' '}
                    {essay.exam_type === 'IELTS-Task1' ? 3 :
                     essay.exam_type === 'IELTS-Task2' || essay.exam_type === 'GRE' ? 6 : 10}
                  </p>
                </div>

                <div>
                  <Label htmlFor="feedback">Comments</Label>
                  <Textarea
                    id="feedback"
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    placeholder="Add your feedback here..."
                    className="min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={handleSaveFeedback}
                  disabled={isSavingFeedback}
                  className="w-full"
                >
                  {isSavingFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Feedback
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Essay Text */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Student Essay
                </CardTitle>
                <CardDescription>
                  Select text to add corrections. Click on yellow highlights to edit or delete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {corrections.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium mb-2">How to use:</p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• <span className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">Yellow highlight</span> = Teacher correction</li>
                      <li>• Select any text to add a new correction</li>
                      <li>• Click on yellow highlights to edit or delete</li>
                    </ul>
                  </div>
                )}

                <SimpleEssayReview
                  originalText={originalText}
                  corrections={corrections}
                  onAddCorrection={handleAddCorrection}
                  onEditCorrection={handleEditCorrection}
                  onDeleteCorrection={handleDeleteCorrection}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

