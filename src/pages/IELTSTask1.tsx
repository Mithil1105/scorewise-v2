import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { SaveStatus } from "@/components/essay/SaveStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRandomTask1Question, IELTSTask1Question } from "@/data/ieltsTask1";
import { exportIELTSTask1AsDocx } from "@/utils/exportIELTS";
import { 
  Play, Pause, RotateCcw, Shuffle, Download, Upload, 
  FileText, Zap, ImageIcon, X, CheckCircle2, AlertCircle, Loader2, Cloud, ClipboardList, ZoomIn, ZoomOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIScorePanel from "@/components/essay/AIScorePanel";
import { useLocalEssays, useLocalImages, useAutoSave } from "@/hooks/useLocalStorage";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { useImageUpload } from "@/hooks/useImageUpload";
import { LocalEssay, LocalImage } from "@/types/essay";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "scorewise_ielts_task1_draft";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const IELTSTask1 = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const assignmentData = location.state as {
    isAssignment?: boolean;
    assignmentId?: string;
    assignmentTitle?: string;
    assignmentTopic?: string;
    assignmentInstructions?: string;
    assignmentImageUrl?: string;
    assignmentMinWords?: number;
    assignmentMaxWords?: number;
    assignmentDueDate?: string;
  } | null;

  const [question, setQuestion] = useState<IELTSTask1Question | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null); // Local preview
  const [cloudImageUrl, setCloudImageUrl] = useState<string | null>(null); // Cloud URL for AI scoring
  const [essay, setEssay] = useState("");
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [currentLocalId, setCurrentLocalId] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(100);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { essays, saveEssays, addEssay, updateEssay, getEssay } = useLocalEssays();
  const { images, addImage, getImagesForEssay } = useLocalImages();
  const { syncEssays, uploadEssay } = useCloudSync();
  const { user, isOnline } = useAuth();
  const { activeMembership } = useInstitution();
  const { uploadImage, uploading, progress: uploadProgress } = useImageUpload();

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const minWords = assignmentData?.assignmentMinWords || 150;
  const maxWords = assignmentData?.assignmentMaxWords;
  const targetReached = wordCount >= minWords;
  
  const { saveStatus, forceSave } = useAutoSave(
    essay,
    currentLocalId,
    updateEssay,
    !!(question || customImage) && essay.length > 0
  );

  const currentEssay = currentLocalId ? getEssay(currentLocalId) : null;
  const isSynced = !!currentEssay?.cloudId;

  // Calculate WPM
  useEffect(() => {
    if (startTime && wordCount > 0) {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0) {
        setWpm(Math.round(wordCount / elapsedMinutes));
      }
    }
  }, [essay, startTime, wordCount]);

  // Auto-submit assignment essay function
  const submitAssignmentEssay = useCallback(async () => {
    if (!assignmentData?.isAssignment || !assignmentData.assignmentId || !activeMembership || !currentLocalId) {
      return;
    }

    try {
      // Get the current essay and update with latest text
      const currentEssayData = getEssay(currentLocalId);
      if (!currentEssayData) {
        return; // No essay found
      }

      // Update essay with current text before submitting
      const updatedEssay = {
        ...currentEssayData,
        essayText: essay,
        wordCount: essay.trim() ? essay.trim().split(/\s+/).length : 0,
        updatedAt: new Date().toISOString()
      };
      updateEssay(currentLocalId, updatedEssay);

      if (!updatedEssay.essayText.trim()) {
        return; // No essay text to submit
      }

      // Ensure essay is saved to cloud first
      let essayId = updatedEssay.cloudId;
      if (!essayId && user && isOnline) {
        // Upload essay to cloud
        essayId = await uploadEssay(updatedEssay);
        if (essayId) {
          updateEssay(currentLocalId, { cloudId: essayId });
        }
      }

      if (!essayId) {
        console.error('Could not save essay to cloud');
        return;
      }

      // Find or create assignment submission
      const { data: existingSubmission, error: findError } = await supabase
        .from('assignment_submissions')
        .select('id')
        .eq('assignment_id', assignmentData.assignmentId)
        .eq('member_id', activeMembership.id)
        .maybeSingle();

      if (findError) throw findError;

      // Update or create submission
      if (existingSubmission) {
        const { error: updateError } = await supabase
          .from('assignment_submissions')
          .update({
            essay_id: essayId,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingSubmission.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: assignmentData.assignmentId,
            member_id: activeMembership.id,
            essay_id: essayId,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      toast({
        title: 'Task 1 submitted!',
        description: assignmentData.isClubbed 
          ? 'Task 1 submitted! Moving to Task 2...'
          : 'Your essay has been automatically submitted to your teacher.',
      });

      // If this is a clubbed assignment, navigate to Task 2
      if (assignmentData.isClubbed && assignmentData.groupId) {
      }
    } catch (err: any) {
      console.error('Error submitting assignment:', err);
      toast({
        title: 'Submission error',
        description: err.message || 'Failed to submit assignment. Please try again.',
        variant: 'destructive',
      });
    }
  }, [assignmentData, activeMembership, currentLocalId, essay, getEssay, user, isOnline, uploadEssay, updateEssay, toast]);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setShowResults(true);
          // Auto-submit when time runs out
          submitAssignmentEssay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, submitAssignmentEssay]);

  // Autosave to localStorage
  useEffect(() => {
    if (essay || customImage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        essay,
        questionId: question?.id,
        customImage,
        cloudImageUrl,
      }));
    }
  }, [essay, question, customImage, cloudImageUrl]);

  // Load assignment data if present (takes precedence over drafts)
  useEffect(() => {
    if (assignmentData?.isAssignment && assignmentData.assignmentTopic) {
      // Create assignment-based question
      const assignmentQuestion: IELTSTask1Question = {
        id: assignmentData.assignmentId || 'assignment',
        type: 'assignment',
        title: assignmentData.assignmentTitle || 'Assignment',
        description: assignmentData.assignmentTopic,
        instructions: assignmentData.assignmentInstructions || "Complete the assignment as instructed."
      };
      setQuestion(assignmentQuestion);
      
      // Load assignment image if provided
      if (assignmentData.assignmentImageUrl) {
        setCloudImageUrl(assignmentData.assignmentImageUrl);
        // For assignment images, we'll display the cloud URL directly
        setCustomImage(null); // Will use cloudImageUrl for display
      }
      
      // Create new local essay entry for assignment
      const localId = crypto.randomUUID();
      const newEssay: LocalEssay = {
        localId,
        examType: 'IELTS-Task1',
        topic: assignmentData.assignmentTopic,
        essayText: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: 0,
        assignmentId: assignmentData.assignmentId
      };
      addEssay(newEssay);
      setCurrentLocalId(localId);
      setEssay('');
      return; // Don't load drafts if this is an assignment
    }
  }, [assignmentData, addEssay]);

  // Load saved draft (only if not an assignment)
  useEffect(() => {
    if (assignmentData?.isAssignment) return; // Skip draft loading for assignments
    
    const continueId = localStorage.getItem('scorewise_continue_essay');
    if (continueId) {
      localStorage.removeItem('scorewise_continue_essay');
      const essayData = getEssay(continueId);
      if (essayData && essayData.examType === 'IELTS-Task1') {
        setCurrentLocalId(continueId);
        setEssay(essayData.essayText);
        // Load associated image if any
        const essayImages = getImagesForEssay(continueId);
        if (essayImages.length > 0) {
          setCustomImage(essayImages[0].imageBase64);
        }
      }
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setEssay(data.essay || "");
          if (data.customImage) setCustomImage(data.customImage);
          if (data.cloudImageUrl) setCloudImageUrl(data.cloudImageUrl);
        } catch (e) {
          console.error("Failed to load draft");
        }
      }
    }
  }, [assignmentData, getEssay, getImagesForEssay]);

  const handleGenerateQuestion = useCallback(async () => {
    // Fetch random question from database
    const { data, error } = await supabase
      .from('ielts_t1')
      .select('*')
      .limit(100);
    
    if (error || !data || data.length === 0) {
      // Fallback to local questions
      const newQuestion = getRandomTask1Question();
      setQuestion(newQuestion);
      setCustomImage(null);
      setCloudImageUrl(null);
    } else {
      // Pick random from database
      const randomItem = data[Math.floor(Math.random() * data.length)];
      setQuestion({
        id: randomItem.id,
        type: 'bar-chart',
        title: randomItem.title,
        description: randomItem.title,
        instructions: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
      });
      
      // If has image in database, use it
      if (randomItem.image_base64) {
        const imageDataUrl = `data:${randomItem.image_type || 'image/png'};base64,${randomItem.image_base64}`;
        setCustomImage(imageDataUrl);
        setCloudImageUrl(null); // DB images don't have cloud URL yet
      } else {
        setCustomImage(null);
        setCloudImageUrl(null);
      }
    }
    
    // Create new local essay entry
    const localId = crypto.randomUUID();
    const newEssay: LocalEssay = {
      localId,
      examType: 'IELTS-Task1',
      topic: 'Generated question',
      essayText: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0
    };
    addEssay(newEssay);
    setCurrentLocalId(localId);
    setEssay('');
  }, [addEssay]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Max 5MB allowed — try resizing the image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only PNG, JPG, and JPEG images are allowed.",
        variant: "destructive",
      });
      return;
    }

    // Create local preview immediately
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageBase64 = event.target?.result as string;
      setCustomImage(imageBase64);
      setQuestion(null);
      
      // Create new local essay entry
      const localId = crypto.randomUUID();
      const newEssay: LocalEssay = {
        localId,
        examType: 'IELTS-Task1',
        topic: 'Custom uploaded image',
        essayText: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: 0
      };
      addEssay(newEssay);
      setCurrentLocalId(localId);
      setEssay('');
      
      // Save image to local storage as backup
      const newImage: LocalImage = {
        localId: crypto.randomUUID(),
        essayLocalId: localId,
        imageBase64,
        imageType: file.type,
        createdAt: new Date().toISOString()
      };
      addImage(newImage);

      // Upload to cloud if user is authenticated and online
      if (user && isOnline) {
        const result = await uploadImage(file, user.id, localId);
        if (result) {
          setCloudImageUrl(result.url);
          
          // Update essay record with cloud image URL
          await supabase
            .from('essays')
            .update({ task1_image_url: result.url })
            .eq('local_id', localId);
        }
      }
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast, addEssay, addImage, user, isOnline, uploadImage]);

  const handleStart = useCallback(() => {
    // Allow starting if it's an assignment (even without question/customImage loaded yet)
    if (!assignmentData?.isAssignment && !question && !customImage && !cloudImageUrl) {
      toast({
        title: "Select a question first",
        description: "Generate a random question or upload an image before starting.",
        variant: "destructive",
      });
      return;
    }
    setIsRunning(true);
    if (!startTime) {
      setStartTime(Date.now());
    }
    textareaRef.current?.focus();
  }, [question, customImage, cloudImageUrl, assignmentData, startTime, toast]);

  const handleToggle = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      handleStart();
    }
  }, [isRunning, handleStart]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(20 * 60);
    setStartTime(null);
    setWpm(0);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      await exportIELTSTask1AsDocx(essay, question, wordCount, !!customImage);
      toast({
        title: "Essay exported!",
        description: "Your Task 1 response has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your essay.",
        variant: "destructive",
      });
    }
  }, [essay, question, wordCount, customImage, toast]);

  const handleStartOver = useCallback(() => {
    setEssay("");
    setQuestion(null);
    setCustomImage(null);
    setCloudImageUrl(null);
    setIsRunning(false);
    setTimeLeft(20 * 60);
    setStartTime(null);
    setWpm(0);
    setShowResults(false);
    setCurrentLocalId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleFinishEarly = useCallback(async () => {
    setIsRunning(false);
    setShowResults(true);
    forceSave();
    
    if (user && isOnline) {
      await syncEssays(essays, saveEssays);
    }

    // Auto-submit if this is an assignment
    await submitAssignmentEssay();
  }, [forceSave, user, isOnline, essays, saveEssays, syncEssays, submitAssignmentEssay]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = (timeLeft / (20 * 60)) * 100;
  const isLowTime = timeLeft < 300;

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">IELTS</Badge>
              <Badge>Task 1</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
              Writing Task 1
            </h1>
            <p className="text-muted-foreground">
              {assignmentData?.isAssignment 
                ? `Assignment: ${assignmentData.assignmentTitle || 'Complete the assignment'}`
                : 'Summarize visual information in at least 150 words'}
            </p>
          </div>
          {(question || customImage) && <SaveStatus status={saveStatus} isSynced={isSynced} />}
        </div>

        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
            <span className="text-sm text-amber-500">Offline Mode: Local Save Active</span>
          </div>
        )}

        {/* Assignment Info Card */}
        {assignmentData?.isAssignment && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {assignmentData.assignmentTitle}
              </CardTitle>
              <CardDescription>Assignment from your teacher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Topic:</p>
                <p className="text-sm text-muted-foreground">{assignmentData.assignmentTopic}</p>
              </div>
              {assignmentData.assignmentInstructions && (
                <div>
                  <p className="text-sm font-medium mb-1">Instructions:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignmentData.assignmentInstructions}</p>
                </div>
              )}
              {(assignmentData.assignmentMinWords || assignmentData.assignmentMaxWords) && (
                <div>
                  <p className="text-sm font-medium mb-1">Word Count:</p>
                  <p className="text-sm text-muted-foreground">
                    {assignmentData.assignmentMinWords && `Minimum: ${assignmentData.assignmentMinWords} words`}
                    {assignmentData.assignmentMinWords && assignmentData.assignmentMaxWords && ' • '}
                    {assignmentData.assignmentMaxWords && `Maximum: ${assignmentData.assignmentMaxWords} words`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Question Selection (disabled for assignments) */}
        {!assignmentData?.isAssignment && (
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleGenerateQuestion} variant="outline" className="gap-2">
              <Shuffle className="h-4 w-4" />
              Random Question
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              className="gap-2"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-primary">Uploading to cloud...</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Instructions Bar */}
        {(question || customImage || cloudImageUrl) && (
          <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-foreground">
              <span className="font-medium">Instructions: </span>
              {question?.instructions || "Summarise the information by selecting and reporting the main features, and make comparisons where relevant."}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              You should write at least 150 words.
            </p>
          </div>
        )}

        {/* Timer and Stats Row */}
        <div className="flex flex-wrap items-center justify-between gap-6 mb-6 p-4 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-6">
            {/* Circular Timer */}
            <div className="relative">
              <svg className="w-20 h-20 md:w-24 md:h-24 -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="6"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke={isLowTime ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={`${283 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center font-mono text-xl md:text-2xl font-bold ${isLowTime ? "text-destructive animate-pulse-soft" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleToggle} variant="outline" size="sm" className="gap-2">
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isRunning ? "Pause" : "Start"}
              </Button>
              <Button onClick={handleReset} variant="ghost" size="sm" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${targetReached ? 'bg-typing/20 text-typing' : 'bg-muted text-muted-foreground'}`}>
              <FileText className="h-4 w-4" />
              <span>{wordCount} / {minWords}{maxWords ? `-${maxWords}` : '+'} words</span>
              {targetReached && <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
              <Zap className="h-4 w-4" />
              <span>{wpm} WPM</span>
            </div>
          </div>
        </div>

        {/* Full Screen Layout: Image Left, Editor Right */}
        {(question || customImage || cloudImageUrl) ? (
          <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-300px)] min-h-[600px]">
            {/* Left Side: Image with Zoom */}
            <div className="flex-shrink-0 lg:w-1/2 border rounded-lg bg-muted/30 overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {cloudImageUrl && (
                    <Badge variant="secondary" className="gap-1">
                      <Cloud className="h-3 w-3" />
                      Assignment Image
                    </Badge>
                  )}
                  {!cloudImageUrl && customImage && (
                    <Badge variant="secondary" className="gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Uploaded Image
                    </Badge>
                  )}
                  {question && !customImage && !cloudImageUrl && (
                    <Badge variant="secondary" className="gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {question.type.replace('-', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageZoom(Math.max(50, imageZoom - 25))}
                    disabled={imageZoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[3rem] text-center">{imageZoom}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageZoom(Math.min(200, imageZoom + 25))}
                    disabled={imageZoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  {!assignmentData?.isAssignment && customImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomImage(null);
                        setCloudImageUrl(null);
                        setImageZoom(100);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div 
                ref={imageContainerRef}
                className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20"
              >
                {cloudImageUrl ? (
                  <img 
                    src={cloudImageUrl} 
                    alt="Assignment image" 
                    className="rounded-md object-contain transition-transform duration-200"
                    style={{ transform: `scale(${imageZoom / 100})`, maxWidth: '100%', maxHeight: '100%' }}
                    loading="lazy"
                  />
                ) : customImage ? (
                  <img 
                    src={customImage} 
                    alt="Uploaded question" 
                    className="rounded-md object-contain transition-transform duration-200"
                    style={{ transform: `scale(${imageZoom / 100})`, maxWidth: '100%', maxHeight: '100%' }}
                    loading="lazy"
                  />
                ) : question && (
                  <div className="text-center p-8">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold text-foreground mb-2">{question.title}</h3>
                    <p className="text-sm text-muted-foreground italic">{question.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Text Editor */}
            <div className="flex-1 lg:w-1/2 flex flex-col border rounded-lg bg-card overflow-hidden">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Your Response</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <Textarea
                  ref={textareaRef}
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                  placeholder="Start writing your response here..."
                  className="h-full w-full text-base md:text-lg leading-relaxed p-4 md:p-6 resize-none focus:ring-2 focus:ring-primary/50 border-0 rounded-none"
                  disabled={showResults}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Fallback: Regular Editor when no image/question */
          <div className="mb-8">
            <Textarea
              ref={textareaRef}
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Start writing your response here..."
              className="min-h-[400px] md:min-h-[450px] text-base md:text-lg leading-relaxed p-4 md:p-6 resize-none focus:ring-2 focus:ring-primary/50"
              disabled={showResults}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {isRunning && (
            <Button onClick={handleFinishEarly} variant="outline" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish Early
            </Button>
          )}
          <AIScorePanel
            essay={essay}
            examType="IELTS"
            taskType="task1"
            topic={question?.description || (customImage ? "Custom uploaded image" : undefined)}
            imageUrl={cloudImageUrl || undefined}
            disabled={isRunning}
          />
          <Button onClick={handleExport} variant="secondary" className="gap-2" disabled={!essay.trim()}>
            <Download className="h-4 w-4" />
            Export .docx
          </Button>
          <Button onClick={handleStartOver} variant="ghost" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Start Over
          </Button>
        </div>

        {/* Cloud Sync Status */}
        {user && cloudImageUrl && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Image-based scoring secured in cloud — ScoreWise
          </p>
        )}
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Time's Up!</DialogTitle>
            <DialogDescription>
              Task 1 session complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{wordCount}</p>
                <p className="text-sm text-muted-foreground">Words Written</p>
                {wordCount >= minWords ? (
                  <Badge className="mt-2 bg-typing">Target Met</Badge>
                ) : (
                  <Badge variant="destructive" className="mt-2">Below Target</Badge>
                )}
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{wpm}</p>
                <p className="text-sm text-muted-foreground">Avg WPM</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <AIScorePanel
                essay={essay}
                examType="IELTS"
                taskType="task1"
                topic={question?.description || (customImage ? "Custom uploaded image" : undefined)}
                imageUrl={cloudImageUrl || undefined}
              />
              <Button onClick={handleExport} variant="secondary" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Export Essay
              </Button>
              <Button onClick={handleStartOver} variant="outline" className="w-full">
                Start New Essay
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default IELTSTask1;
