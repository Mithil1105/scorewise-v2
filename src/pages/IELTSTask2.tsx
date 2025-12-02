import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { SaveStatus } from "@/components/essay/SaveStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getRandomTask2Topic, getIELTSTask2Topics, IELTSTask2Topic, task2TypeLabels } from "@/data/ieltsTask2";
import { exportIELTSTask2AsDocx } from "@/utils/exportIELTS";
import { 
  Play, Pause, RotateCcw, Shuffle, Download, Edit3,
  FileText, Zap, CheckCircle2, AlertCircle, ChevronDown, StickyNote, ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIScorePanel from "@/components/essay/AIScorePanel";
import { useLocalEssays, useAutoSave } from "@/hooks/useLocalStorage";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { LocalEssay } from "@/types/essay";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingStorage, calculateStorageSizeKb } from "@/utils/storageUsage";

const STORAGE_KEY = "scorewise_ielts_task2_draft";

const IELTSTask2 = () => {
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

  const [topic, setTopic] = useState<IELTSTask2Topic | null>(null);
  const [topicType, setTopicType] = useState<IELTSTask2Topic['type'] | 'all'>('all');
  const [customTopic, setCustomTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [currentLocalId, setCurrentLocalId] = useState<string | null>(null);
  // Track cloud essay ID (null until first successful submit)
  const [currentEssayId, setCurrentEssayId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const { essays, saveEssays, addEssay, updateEssay, getEssay } = useLocalEssays();
  const { uploadEssay, updateCloudEssay } = useCloudSync();
  const { user, isOnline } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const minWords = assignmentData?.assignmentMinWords || 250;
  const maxWords = assignmentData?.assignmentMaxWords;
  const targetReached = wordCount >= minWords;
  
  const { saveStatus, forceSave } = useAutoSave(essay, currentLocalId, updateEssay, !!topic && essay.length > 0);
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

  /**
   * UNIFIED SUBMIT FUNCTION FOR IELTS TASK 2
   * Used by both manual submit and timer end
   */
  const submitEssayToCloud = useCallback(async (): Promise<{ success: boolean; essayId: string | null; error?: string }> => {
    // Validation: Don't allow empty submissions
    if (!essay.trim()) {
      toast({
        title: 'Cannot submit empty essay',
        description: 'Please write some content before submitting.',
        variant: 'destructive',
      });
      return { success: false, essayId: null, error: 'Empty essay' };
    }

    if (!user) {
      toast({
        title: 'Submission error',
        description: 'Please log in to submit your essay.',
        variant: 'destructive',
      });
      return { success: false, essayId: null, error: 'Not logged in' };
    }

    if (!isOnline) {
      toast({
        title: 'Offline',
        description: 'Please connect to the internet to submit your essay.',
        variant: 'destructive',
      });
      return { success: false, essayId: null, error: 'Offline' };
    }

    if (!topic) {
      toast({
        title: 'Submission error',
        description: 'Please select a topic before submitting.',
        variant: 'destructive',
      });
      return { success: false, essayId: null, error: 'No topic' };
    }

    setIsSubmitting(true);

    try {
      // Read current editor text (single source of truth)
      const currentText = essay.trim();
      
      // Calculate word count correctly
      const calculatedWordCount = currentText
        ? currentText.split(/\s+/).filter(word => word.length > 0).length
        : 0;

      // Check storage limit before upload
      const storageSizeKb = calculateStorageSizeKb(currentText);
      const { remaining } = await getRemainingStorage(supabase, user.id);
      
      if (remaining < storageSizeKb) {
        toast({
          title: "Storage limit exceeded",
          description: "You've used 5MB of storage. Delete old drafts to continue.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return { success: false, essayId: null, error: 'Storage limit exceeded' };
      }

      // Determine if this is first submit
      const isFirstSubmit = !currentEssayId;

      // Build payload - ALWAYS include both topic AND essay_text
      const payload: any = {
        user_id: user.id,
        exam_type: 'IELTS-Task2',
        topic: topic.topic || '',
        essay_text: currentText || '', // ALWAYS include essay_text, never null
        word_count: calculatedWordCount || 0,
        institution_id: activeMembership?.status === 'active' ? activeInstitution?.id : null,
        institution_member_id: activeMembership?.status === 'active' ? activeMembership?.id : null,
      };
      
      // Set original_essay_text only on first submit
      if (isFirstSubmit) {
        payload.original_essay_text = currentText || '';
      }
      
      // Remove any null/undefined values that might cause issues (but keep empty strings)
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      // Final validation - ensure essay_text is present
      if (!payload.essay_text || payload.essay_text.length === 0) {
        console.error('ERROR: essay_text is empty in payload!', payload);
        toast({
          title: 'Submission error',
          description: 'Essay text is empty. Cannot submit.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return { success: false, essayId: null, error: 'Empty essay text' };
      }

      console.log('Submitting IELTS Task 2 essay to cloud:', {
        isFirstSubmit,
        topic: topic.topic,
        essayTextLength: currentText.length,
        wordCount: calculatedWordCount,
        currentEssayId,
        payloadEssayText: payload.essay_text.substring(0, 100), // Preview first 100 chars
      });

      let resultEssayId: string | null = null;

      if (isFirstSubmit) {
        // INSERT new essay
        console.log('INSERT payload:', JSON.stringify(payload, null, 2));
        
        const { data, error } = await supabase
          .from('essays')
          .insert(payload)
          .select('id, essay_text, original_essay_text, word_count, topic')
          .single();

        if (error) {
          console.error('Error inserting essay:', {
            user_id: user.id,
            exam_type: 'IELTS-Task2',
            topic: topic.topic,
            error: error.message,
            errorDetails: error,
            payload,
          });
          toast({
            title: 'Submission error',
            description: `Failed to save essay: ${error.message}`,
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return { success: false, essayId: null, error: error.message };
        }

        if (!data || !data.id) {
          console.error('Insert succeeded but no ID returned');
          toast({
            title: 'Submission error',
            description: 'Failed to save essay: No ID returned from server.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return { success: false, essayId: null, error: 'No ID returned' };
        }

        resultEssayId = data.id;
        setCurrentEssayId(data.id);

        // Update local essay with cloudId
        if (currentLocalId) {
          updateEssay(currentLocalId, { 
            cloudId: data.id,
            essayText: currentText,
            wordCount: calculatedWordCount,
          });
        }

        console.log('Essay inserted successfully:', {
          id: data.id,
          topic: data.topic,
          essayTextLength: data.essay_text?.length || 0,
          essayTextPreview: data.essay_text?.substring(0, 100) || 'EMPTY',
          wordCount: data.word_count,
          hasOriginalText: !!data.original_essay_text,
        });
        
        // Verify the data was actually saved
        if (!data.essay_text || data.essay_text.length === 0) {
          console.error('WARNING: Essay text is empty after insert!', {
            payloadEssayTextLength: currentText.length,
            returnedEssayTextLength: data.essay_text?.length || 0,
          });
        }
      } else {
        // UPDATE existing essay (never overwrite original_essay_text)
        const updatePayload = {
          essay_text: currentText,
          word_count: calculatedWordCount,
          updated_at: new Date().toISOString(),
          // Do NOT update original_essay_text - it's set once on first submit
        };
        
        console.log('UPDATE payload:', JSON.stringify(updatePayload, null, 2));
        
        const { data, error } = await supabase
          .from('essays')
          .update(updatePayload)
          .eq('id', currentEssayId)
          .eq('user_id', user.id)
          .select('id, essay_text, word_count, topic')
          .single();

        if (error) {
          console.error('Error updating essay:', {
            user_id: user.id,
            essay_id: currentEssayId,
            error: error.message,
            errorDetails: error,
          });
          toast({
            title: 'Submission error',
            description: `Failed to update essay: ${error.message}`,
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return { success: false, essayId: null, error: error.message };
        }

        if (!data || !data.id) {
          console.error('Update succeeded but no data returned');
          toast({
            title: 'Submission error',
            description: 'Failed to update essay: No data returned from server.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return { success: false, essayId: null, error: 'No data returned' };
        }

        resultEssayId = data.id;

        // Update local essay
        if (currentLocalId) {
          updateEssay(currentLocalId, { 
            essayText: currentText,
            wordCount: calculatedWordCount,
          });
        }

        console.log('Essay updated successfully:', {
          id: data.id,
          topic: data.topic,
          essayTextLength: data.essay_text?.length || 0,
          essayTextPreview: data.essay_text?.substring(0, 100) || 'EMPTY',
          wordCount: data.word_count,
        });
        
        // Verify the data was actually saved
        if (!data.essay_text || data.essay_text.length === 0) {
          console.error('WARNING: Essay text is empty after update!', {
            payloadEssayTextLength: currentText.length,
            returnedEssayTextLength: data.essay_text?.length || 0,
          });
        }
      }

      // Clear localStorage draft after successful submit
      localStorage.removeItem(STORAGE_KEY);

      setIsSubmitting(false);
      
      toast({
        title: 'Essay submitted successfully 🎉',
        description: 'Your essay has been saved to the cloud.',
      });

      return { success: true, essayId: resultEssayId };
    } catch (err: any) {
      console.error('Error submitting essay:', {
        user_id: user.id,
        exam_type: 'IELTS-Task2',
        topic: topic?.topic,
        error: err.message,
        errorStack: err.stack,
      });
      
      toast({
        title: 'Submission error',
        description: err.message || 'Failed to submit essay. Your essay is still saved locally. Please try again.',
        variant: 'destructive',
      });
      
      setIsSubmitting(false);
      return { success: false, essayId: null, error: err.message || 'Unknown error' };
    }
  }, [essay, user, isOnline, topic, currentEssayId, currentLocalId, activeMembership, activeInstitution, updateEssay, toast]);

  // Auto-submit assignment essay function
  const submitAssignmentEssay = useCallback(async () => {
    if (!assignmentData?.isAssignment || !assignmentData.assignmentId || !activeMembership) {
      return;
    }

    // First submit the essay to cloud using unified function
    const result = await submitEssayToCloud();
    
    if (!result.success || !result.essayId) {
      // Error already shown by submitEssayToCloud
      return;
    }

    try {
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
            essay_id: result.essayId,
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
            essay_id: result.essayId,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      toast({
        title: 'Assignment submitted!',
        description: 'Your essay has been automatically submitted to your teacher.',
      });
    } catch (err: any) {
      console.error('Error submitting assignment:', err);
      toast({
        title: 'Submission error',
        description: err.message || 'Failed to submit assignment. Please try again.',
        variant: 'destructive',
      });
    }
  }, [assignmentData, activeMembership, submitEssayToCloud, toast]);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          // DO NOT clear essay - keep it visible
          // Call submit function which will handle everything
          if (assignmentData?.isAssignment) {
            submitAssignmentEssay();
          } else {
            submitEssayToCloud().then(result => {
              if (result.success) {
                setShowResults(true);
              }
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, submitAssignmentEssay, submitEssayToCloud, assignmentData]);

  // Autosave
  useEffect(() => {
    if (essay || notes) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        essay,
        notes,
        topicId: topic?.id,
      }));
    }
  }, [essay, notes, topic]);

  // Preload topics when component mounts
  useEffect(() => {
    getIELTSTask2Topics().catch(error => {
      console.error('Failed to preload topics:', error);
    });
  }, []);

  // Load saved draft
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setEssay(data.essay || "");
        setNotes(data.notes || "");
      } catch (e) {
        console.error("Failed to load draft");
      }
    }
  }, []);

  const handleGenerateTopic = useCallback(async () => {
    try {
      const type = topicType === 'all' ? undefined : topicType;
      const newTopic = await getRandomTask2Topic(type);
      setTopic(newTopic);
      setCustomTopic("");
    } catch (error) {
      console.error('Error generating topic:', error);
      toast({
        title: "Error loading topic",
        description: error instanceof Error ? error.message : "Failed to load a random topic. Please try again.",
        variant: "destructive",
      });
    }
  }, [topicType, toast]);

  const handleUseCustomTopic = useCallback(() => {
    if (customTopic.trim()) {
      setTopic({
        id: "custom",
        type: "opinion",
        topic: customTopic.trim(),
        instructions: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
      });
    }
  }, [customTopic]);

  const handleStart = useCallback(() => {
    if (!topic) {
      toast({
        title: "Select a topic first",
        description: "Generate a random topic or enter a custom one before starting.",
        variant: "destructive",
      });
      return;
    }
    setIsRunning(true);
    if (!startTime) {
      setStartTime(Date.now());
    }
    textareaRef.current?.focus();
  }, [topic, startTime, toast]);

  const handleToggle = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      handleStart();
    }
  }, [isRunning, handleStart]);

  const handleReset = useCallback(() => {
    // Only reset timer, don't clear essay
    setIsRunning(false);
    setTimeLeft(40 * 60);
    setStartTime(null);
    setWpm(0);
    setShowResults(false);
    // DO NOT clear essay - keep it visible
  }, []);

  const handleExport = useCallback(async () => {
    try {
      await exportIELTSTask2AsDocx(essay, topic, wordCount);
      toast({
        title: "Essay exported!",
        description: "Your Task 2 essay has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your essay.",
        variant: "destructive",
      });
    }
  }, [essay, topic, wordCount, toast]);

  const handleStartOver = useCallback(() => {
    setEssay("");
    setTopic(null);
    setCustomTopic("");
    setNotes("");
    setIsRunning(false);
    setTimeLeft(40 * 60);
    setStartTime(null);
    setWpm(0);
    setShowResults(false);
    setCurrentEssayId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Manual submit handler
  const handleSubmitEssay = useCallback(async () => {
    await submitEssayToCloud();
  }, [submitEssayToCloud]);

  const handleTimeEnd = useCallback(async () => {
    setIsRunning(false);
    forceSave();

    // Call unified submit function
    const result = await submitEssayToCloud();
    
    if (!result.success) {
      // Show error - don't open results dialog
      // Essay text remains visible in editor
      toast({
        title: "Couldn't save essay",
        description: "We couldn't save this to the cloud. Your text is still here; please retry submit.",
        variant: 'destructive',
      });
      return;
    }

    // Calculate final WPM
    let finalWpm = 0;
    if (startTime && wordCount > 0) {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0) {
        finalWpm = Math.round(wordCount / elapsedMinutes);
      }
    }

    // Update WPM state
    setWpm(finalWpm);
    
    // Open results dialog with actual data
    // Essay text remains visible in editor - DO NOT clear it
    setShowResults(true);
  }, [forceSave, submitEssayToCloud, startTime, wordCount, toast]);

  const handleFinishEarly = useCallback(async () => {
    setIsRunning(false);
    forceSave();

    // Call unified submit function
    const result = await submitEssayToCloud();
    
    if (!result.success) {
      // Error already shown
      return;
    }

    // Calculate final WPM
    let finalWpm = 0;
    if (startTime && wordCount > 0) {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0) {
        finalWpm = Math.round(wordCount / elapsedMinutes);
      }
    }

    setWpm(finalWpm);
    setShowResults(true);
    // Essay text remains visible - DO NOT clear it
  }, [forceSave, submitEssayToCloud, startTime, wordCount]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = (timeLeft / (40 * 60)) * 100;
  const isLowTime = timeLeft < 600; // 10 minutes

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">IELTS</Badge>
              <Badge>Task 2</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
              Writing Task 2
            </h1>
            <p className="text-muted-foreground">
              Write an essay of at least 250 words
            </p>
          </div>
          {topic && <SaveStatus status={saveStatus} isSynced={isSynced} />}
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

        {/* Topic Selection (disabled for assignments) */}
        {!assignmentData?.isAssignment && (
          <div className="mb-6">
            {/* Topic Selection */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Task:</label>
              <Select value="task2" disabled>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Task Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task1">Task 1</SelectItem>
                  <SelectItem value="task2">Task 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Category:</label>
              <Select value={topicType} onValueChange={(v) => setTopicType(v as typeof topicType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Question type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(task2TypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleGenerateTopic} variant="outline" className="gap-2">
              <Shuffle className="h-4 w-4" />
              Random Topic
            </Button>
          </div>
        </div>

            {/* Custom Topic Input */}
            <div className="flex gap-2 mb-6">
          <Textarea
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Or enter your own topic..."
            className="resize-none h-20"
            spellCheck={false}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
          />
          <Button 
            onClick={handleUseCustomTopic} 
            variant="secondary"
            disabled={!customTopic.trim()}
            className="shrink-0"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>
          </div>
        )}

        {/* Topic Display */}
        {topic && (
          <div className="mb-6 bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="capitalize">
                {topic.type.replace('-', ' ')}
              </Badge>
            </div>
            <p className="text-foreground leading-relaxed font-serif mb-4">{topic.topic}</p>
            <p className="text-sm text-muted-foreground italic">{topic.instructions}</p>
          </div>
        )}

        {/* Timer and Stats Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-4">
            {/* Circular Timer */}
            <div className="relative">
              <svg className="w-20 h-20 -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="4"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke={isLowTime ? "hsl(var(--destructive))" : "hsl(var(--typing))"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center font-mono text-lg font-bold ${isLowTime ? "text-destructive animate-pulse-soft" : "text-foreground"}`}>
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
            <div className={`stat-badge ${targetReached ? 'bg-typing/20 text-typing' : ''}`}>
              <FileText className="h-4 w-4" />
              <span>{wordCount} / {minWords}{maxWords ? `-${maxWords}` : '+'} words</span>
              {targetReached && <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div className="stat-badge">
              <Zap className="h-4 w-4" />
              <span>{wpm} WPM</span>
            </div>
          </div>
        </div>

        {/* Word count warning */}

        {/* Notes Section (Collapsible) */}
        <Collapsible open={showNotes} onOpenChange={setShowNotes} className="mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 mb-2">
              <StickyNote className="h-4 w-4" />
              Planning Notes
              <ChevronDown className={`h-4 w-4 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down your ideas, structure, key points..."
              className="resize-none h-24 bg-muted/50 text-sm"
              spellCheck={false}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Essay Editor */}
        <div className="mb-6">
          <Textarea
            ref={textareaRef}
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder={isRunning ? "Start writing your essay here..." : essay.trim() ? "Your essay is saved. You can continue editing..." : "Click 'Start' to begin writing..."}
            className="essay-editor min-h-[500px] text-base"
            disabled={showResults}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
          />
        </div>

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
            taskType="task2"
            topic={topic?.topic}
            disabled={isRunning}
            essayId={currentEssayId || undefined}
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
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Time's Up!</DialogTitle>
            <DialogDescription>
              Task 2 essay session complete.
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
                <p className="text-sm text-muted-foreground">Avg. WPM</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => {
                  if (currentEssayId) {
                    // Navigate to review page if we have essay ID
                    navigate(`/review/${currentEssayId}`);
                  } else {
                    setShowResults(false);
                  }
                }} 
                className="flex-1 gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Review
              </Button>
              <Button onClick={handleExport} variant="secondary" className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default IELTSTask2;
