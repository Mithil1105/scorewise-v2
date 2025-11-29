import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  FileText, 
  User, 
  Calendar,
  MessageSquare,
  Star,
  Edit2,
  CheckCircle2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Undo,
  Redo
} from "lucide-react";
import { format } from "date-fns";

interface EssayData {
  id: string;
  topic: string | null;
  essay_text: string | null;
  exam_type: string;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

interface AssignmentData {
  id: string;
  title: string;
  topic: string;
  instructions: string | null;
  image_url: string | null;
  exam_type: string;
}

interface SubmissionData {
  id: string;
  status: string;
  submitted_at: string | null;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  assignment_id: string;
  member: {
    user_id: string;
    profile?: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

const ReviewAssignmentEssay = () => {
  const { essayId } = useParams<{ essayId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeMembership } = useInstitution();

  const [essay, setEssay] = useState<EssayData | null>(null);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Feedback state
  const [editedEssayText, setEditedEssayText] = useState("");
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [teacherScore, setTeacherScore] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  
  // Rich text editor ref
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!essayId) {
        toast({
          title: "Invalid link",
          description: "Essay ID is missing.",
          variant: "destructive",
        });
        navigate("/institution/teacher");
        return;
      }

      try {
        // Fetch essay
        const { data: essayData, error: essayError } = await supabase
          .from("essays")
          .select("id, topic, essay_text, exam_type, word_count, created_at, updated_at")
          .eq("id", essayId)
          .maybeSingle();

        if (essayError) throw essayError;

        if (!essayData) {
          toast({
            title: "Essay not found",
            description: "This essay may have been deleted.",
            variant: "destructive",
          });
          navigate("/institution/teacher");
          return;
        }

        setEssay(essayData);
        setEditedEssayText(essayData.essay_text || "");

        // Fetch submission data with assignment
        const { data: submissionData, error: submissionError } = await supabase
          .from("assignment_submissions")
          .select(`
            id,
            status,
            submitted_at,
            teacher_feedback,
            teacher_score,
            reviewed_at,
            member_id,
            assignment_id
          `)
          .eq("essay_id", essayId)
          .maybeSingle();

        if (submissionError) throw submissionError;

        if (submissionData) {
          // Fetch assignment details
          const { data: assignmentData, error: assignmentError } = await supabase
            .from("assignments")
            .select("id, title, topic, instructions, image_url, exam_type")
            .eq("id", submissionData.assignment_id)
            .maybeSingle();

          if (assignmentError) {
            console.error("Error fetching assignment:", assignmentError);
          } else if (assignmentData) {
            setAssignment(assignmentData);
          }
          // Fetch member and profile data
          const { data: memberData, error: memberError } = await supabase
            .from("institution_members")
            .select("id, user_id")
            .eq("id", submissionData.member_id)
            .maybeSingle();

          if (memberError) {
            console.error("Error fetching member:", memberError);
          }

          let profileData = null;
          if (memberData) {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("user_id, display_name, avatar_url")
              .eq("user_id", memberData.user_id)
              .maybeSingle();

            if (profileError) {
              console.error("Error fetching profile:", profileError);
            } else {
              profileData = profile;
            }

            // If no profile found or no display name, create/update with default
            if (!profileData || !profileData.display_name) {
              const defaultName = `Student ${memberData.user_id.substring(0, 8)}`;
              if (!profileData) {
                // Create profile if it doesn't exist
                const { data: newProfile } = await supabase
                  .from("profiles")
                  .insert({
                    user_id: memberData.user_id,
                    display_name: defaultName
                  })
                  .select()
                  .single();
                if (newProfile) profileData = newProfile;
              } else if (!profileData.display_name) {
                // Update existing profile with default name
                const { data: updatedProfile } = await supabase
                  .from("profiles")
                  .update({ display_name: defaultName })
                  .eq("user_id", memberData.user_id)
                  .select()
                  .single();
                if (updatedProfile) profileData = updatedProfile;
              }
            }
          }

          setSubmission({
            ...submissionData,
            assignment_id: submissionData.assignment_id,
            member: memberData ? {
              user_id: memberData.user_id,
              profile: profileData
            } : null
          });

          setTeacherFeedback(submissionData.teacher_feedback || "");
          setTeacherScore(submissionData.teacher_score?.toString() || "");
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        toast({
          title: "Error loading essay",
          description: err.message || "Please try again later.",
          variant: "destructive",
        });
        navigate("/institution/teacher");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [essayId, navigate, toast]);

  // Track changes
  useEffect(() => {
    if (essay) {
      const textChanged = editedEssayText !== (essay.essay_text || "");
      const feedbackChanged = teacherFeedback !== (submission?.teacher_feedback || "");
      const scoreChanged = teacherScore !== (submission?.teacher_score?.toString() || "");
      setHasChanges(textChanged || feedbackChanged || scoreChanged);
    }
  }, [editedEssayText, teacherFeedback, teacherScore, essay, submission]);

  // Rich text editor functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditedEssayText(editorRef.current.innerHTML);
    }
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      setEditedEssayText(editorRef.current.innerHTML);
    }
  };

  // Initialize editor content when switching to edit mode
  useEffect(() => {
    if (isEditing && editorRef.current && essay) {
      editorRef.current.innerHTML = editedEssayText || essay.essay_text || "";
    }
  }, [isEditing, essay]);

  const handleSave = async () => {
    if (!essay || !submission) return;

    setIsSaving(true);
    try {
      const originalEssayText = essay.essay_text || "";
      const hasEdits = editedEssayText !== originalEssayText;
      
      // Update essay text if edited
      if (hasEdits) {
        const { error: essayError } = await supabase
          .from("essays")
          .update({
            essay_text: editedEssayText,
            word_count: editedEssayText.trim() ? editedEssayText.trim().split(/\s+/).length : 0,
            updated_at: new Date().toISOString(),
            // Store original text for student to see changes
            original_text: originalEssayText
          })
          .eq("id", essay.id);

        if (essayError) throw essayError;
      }

      // Update submission with feedback and original essay text
      const scoreValue = teacherScore.trim() ? parseFloat(teacherScore) : null;
      const updateData: any = {
          teacher_feedback: teacherFeedback.trim() || null,
          teacher_score: scoreValue,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
          status: 'reviewed',
          updated_at: new Date().toISOString()
      };

      // Store original essay text in submission if teacher made edits
      if (hasEdits) {
        updateData.original_essay_text = originalEssayText;
      }

      const { error: submissionError } = await supabase
        .from("assignment_submissions")
        .update(updateData)
        .eq("id", submission.id);

      if (submissionError) throw submissionError;

      // Update local state
      setEssay({
        ...essay,
        essay_text: editedEssayText,
        word_count: editedEssayText.trim() ? editedEssayText.trim().split(/\s+/).length : 0
      });

      setSubmission({
        ...submission,
        teacher_feedback: teacherFeedback.trim() || null,
        teacher_score: scoreValue,
        reviewed_at: new Date().toISOString(),
        status: 'reviewed'
      });

      setIsEditing(false);
      setHasChanges(false);

      toast({
        title: "Feedback saved!",
        description: "Your feedback has been saved successfully.",
      });
    } catch (err: any) {
      console.error("Failed to save feedback:", err);
      toast({
        title: "Failed to save",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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

  if (!essay) {
    return (
      <PageLayout>
        <TopBar />
        <div className="px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Essay Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This essay may have been deleted or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/institution/teacher")}>Go Back</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2 mb-4"
            onClick={() => navigate("/institution/teacher")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assignments
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
                Review Assignment Essay
              </h1>
              <p className="text-muted-foreground">
                Review and provide feedback on student's submission
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-amber-600">
                  Unsaved changes
                </Badge>
              )}
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "default" : "outline"}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                {isEditing ? "View Mode" : "Edit Mode"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Feedback
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Essay Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Info Card */}
            {submission?.member && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Student Name</Label>
                      <p className="font-medium">
                        {submission.member.profile?.display_name || "Unknown Student"}
                      </p>
                    </div>
                    {submission.submitted_at && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Submitted</Label>
                        <p className="text-sm">
                          {format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Badge 
                        variant={submission.status === 'reviewed' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {submission.status === 'reviewed' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Reviewed
                          </>
                        ) : (
                          'Submitted'
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assignment Question Card */}
            {assignment && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Assignment Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="font-semibold">{assignment.title}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Topic/Prompt</Label>
                    <p className="text-sm whitespace-pre-wrap italic">{assignment.topic}</p>
                  </div>
                  {assignment.instructions && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Instructions</Label>
                      <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
                    </div>
                  )}
                  {assignment.image_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Reference Image</Label>
                      <img 
                        src={assignment.image_url} 
                        alt="Assignment reference" 
                        className="mt-2 max-w-full rounded-lg border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Essay Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-lg font-medium">
                      {essay.exam_type} Essay
                    </CardTitle>
                    {essay.topic && (
                      <CardDescription className="mt-1 italic">
                        "{essay.topic}"
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      <FileText className="h-3 w-3 mr-1" />
                      {essay.word_count || 0} words
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Formatting Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 p-2 border rounded-lg bg-muted/50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => formatText('bold')}
                        className="h-8 w-8 p-0"
                        title="Bold (Ctrl+B)"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => formatText('italic')}
                        className="h-8 w-8 p-0"
                        title="Italic (Ctrl+I)"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => formatText('underline')}
                        className="h-8 w-8 p-0"
                        title="Underline (Ctrl+U)"
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => formatText('strikeThrough')}
                        className="h-8 w-8 p-0"
                        title="Strikethrough"
                      >
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => formatText('backColor', '#fef08a')}
                        className="h-8 w-8 p-0"
                        title="Highlight (Yellow)"
                      >
                        <Highlighter className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          onChange={(e) => formatText('foreColor', e.target.value)}
                          className="h-8 w-8 cursor-pointer border rounded"
                          title="Text Color"
                        />
                        <Palette className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => formatText('undo')}
                        className="h-8 w-8 p-0"
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => formatText('redo')}
                        className="h-8 w-8 p-0"
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Rich Text Editor */}
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={handleEditorChange}
                      className="min-h-[400px] p-4 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary prose prose-sm max-w-none dark:prose-invert"
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                      suppressContentEditableWarning
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Select text and use the toolbar to format. Changes will be visible to students in different colors.
                    </p>
                  </div>
                ) : (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: editedEssayText || "No content available." }}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Feedback Sidebar */}
          <div className="space-y-6">
            {/* Feedback Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Teacher Feedback
                </CardTitle>
                <CardDescription>
                  Provide feedback and score for this submission
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score */}
                <div>
                  <Label htmlFor="score" className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4" />
                    Score {essay.exam_type === 'GRE' ? '(out of 6)' : essay.exam_type === 'IELTS-Task1' ? '(out of 3)' : essay.exam_type === 'IELTS-Task2' ? '(out of 6)' : '(out of 10)'}
                  </Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max={essay.exam_type === 'GRE' ? 6 : essay.exam_type === 'IELTS-Task1' ? 3 : essay.exam_type === 'IELTS-Task2' ? 6 : 10}
                    step={essay.exam_type === 'GRE' ? 0.5 : essay.exam_type === 'IELTS-Task1' ? 0.5 : essay.exam_type === 'IELTS-Task2' ? 0.5 : 0.5}
                    value={teacherScore}
                    onChange={(e) => setTeacherScore(e.target.value)}
                    placeholder={essay.exam_type === 'GRE' ? 'e.g., 5.5' : essay.exam_type === 'IELTS-Task1' ? 'e.g., 2.5' : essay.exam_type === 'IELTS-Task2' ? 'e.g., 5.5' : 'e.g., 8.5'}
                  />
                </div>

                {/* Feedback */}
                <div>
                  <Label htmlFor="feedback" className="mb-2 block">
                    Comments & Recommendations
                  </Label>
                  <Textarea
                    id="feedback"
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    placeholder="Provide constructive feedback on the essay's strengths and areas for improvement..."
                    className="min-h-[200px]"
                  />
                </div>

                {/* Previous Feedback Display */}
                {submission?.teacher_feedback && !isEditing && (
                  <div className="p-3 bg-muted rounded-lg">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Previous Feedback
                    </Label>
                    <p className="text-sm whitespace-pre-wrap">
                      {submission.teacher_feedback}
                    </p>
                    {submission.teacher_score && (
                      <Badge variant="secondary" className="mt-2">
                        Score: {submission.teacher_score}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Essay Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Essay Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Exam Type</Label>
                  <p className="font-medium">{essay.exam_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p>{format(new Date(essay.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p>{format(new Date(essay.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ReviewAssignmentEssay;

