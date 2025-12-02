import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Timer } from "@/components/essay/Timer";
import { TopicCard } from "@/components/essay/TopicCard";
import { EssayStats } from "@/components/essay/EssayStats";
import { SaveStatus } from "@/components/essay/SaveStatus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRandomTopic, GRETopic } from "@/data/greTopics";
import { exportEssayAsDocx } from "@/utils/exportEssay";
import { Shuffle, Edit3, Download, RotateCcw, CheckCircle2, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIScorePanel from "@/components/essay/AIScorePanel";
import { useLocalEssays, useAutoSave } from "@/hooks/useLocalStorage";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { LocalEssay } from "@/types/essay";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingStorage, calculateStorageSizeKb } from "@/utils/storageUsage";

const Essay = () => {
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

  const [topic, setTopic] = useState<GRETopic | null>(null);
  const [topicType, setTopicType] = useState<'issue' | 'argument'>('issue');
  const [customTopic, setCustomTopic] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  // SINGLE SOURCE OF TRUTH: essay state holds the current text
  const [essay, setEssay] = useState("");
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [currentLocalId, setCurrentLocalId] = useState<string | null>(null);
  
  // Track cloud essay ID (null until first successful submit)
  const [currentEssayId, setCurrentEssayId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const { essays, saveEssays, addEssay, updateEssay, getEssay, deleteEssay } = useLocalEssays();
  const { uploadEssay, updateCloudEssay } = useCloudSync();
  const { user, isOnline } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();

  // Calculate word count from current essay state (single source of truth)
  const wordCount = essay.trim() 
    ? essay.trim().split(/\s+/).filter(word => word.length > 0).length 
    : 0;
  
  // Local autosave only (no cloud sync)
  const { saveStatus, forceSave } = useAutoSave(
    essay,
    currentLocalId,
    updateEssay,
    !!topic && essay.length > 0
  );

  // Check if current essay is synced
  const currentEssay = currentLocalId ? getEssay(currentLocalId) : null;
  const isSynced = !!currentEssay?.cloudId;

  // Calculate WPM from current essay state
  useEffect(() => {
    if (startTime && wordCount > 0) {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      if (elapsedMinutes > 0) {
        setWpm(Math.round(wordCount / elapsedMinutes));
      }
    }
  }, [essay, startTime, wordCount]);

  // Generate unique localStorage key for draft restoration
  const getDraftKey = useCallback((userId: string, examType: string, topicText: string) => {
    // Create a stable key from user + exam + topic
    const topicHash = topicText.substring(0, 50).replace(/\s+/g, '_');
    return `essay_draft_${userId}_${examType}_${topicHash}`;
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (assignmentData?.isAssignment) return; // Skip for assignments
    
    if (!user || !topic) return;

    const draftKey = getDraftKey(user.id, 'GRE', topic.topic);
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.essayText && draft.essayText.trim()) {
          setEssay(draft.essayText);
          console.log('Restored draft from localStorage:', {
            topic: topic.topic,
            textLength: draft.essayText.length,
            wordCount: draft.wordCount || 0,
          });
        }
      } catch (err) {
        console.error('Failed to parse draft:', err);
      }
    }
  }, [user, topic, assignmentData, getDraftKey]);

  // Save draft to localStorage on every change (local autosave only)
  useEffect(() => {
    if (!user || !topic || assignmentData?.isAssignment) return;
    if (!essay.trim()) return;

    const draftKey = getDraftKey(user.id, 'GRE', topic.topic);
    const draft = {
      essayText: essay,
      wordCount: wordCount,
      topic: topic.topic,
      examType: 'GRE',
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [essay, wordCount, topic, user, assignmentData, getDraftKey]);

  /**
   * UNIFIED SUBMIT FUNCTION
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
      // Ensure essay_text is never null or empty string
      const payload: any = {
        user_id: user.id,
        exam_type: 'GRE',
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

      console.log('Submitting essay to cloud:', {
        isFirstSubmit,
        topic: topic.topic,
        essayTextLength: currentText.length,
        wordCount: calculatedWordCount,
        currentEssayId,
      });

      let resultEssayId: string | null = null;

      if (isFirstSubmit) {
        // INSERT new essay
        // Log the full payload to verify essay_text is included
        console.log('INSERT payload:', JSON.stringify(payload, null, 2));
        
        const { data, error } = await supabase
          .from('essays')
          .insert(payload)
          .select('id, essay_text, original_essay_text, word_count, topic')
          .single();

        if (error) {
          console.error('Error inserting essay:', {
            user_id: user.id,
            exam_type: 'GRE',
            topic: topic.topic,
            error: error.message,
            errorDetails: error,
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
      if (topic) {
        const draftKey = getDraftKey(user.id, 'GRE', topic.topic);
        localStorage.removeItem(draftKey);
      }

      setIsSubmitting(false);
      
      toast({
        title: 'Essay submitted successfully 🎉',
        description: 'Your essay has been saved to the cloud.',
      });

      return { success: true, essayId: resultEssayId };
    } catch (err: any) {
      console.error('Error submitting essay:', {
        user_id: user.id,
        exam_type: 'GRE',
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
  }, [essay, user, isOnline, topic, currentEssayId, currentLocalId, activeMembership, activeInstitution, updateEssay, toast, getDraftKey]);

  // Manual submit handler
  const handleSubmitEssay = useCallback(async () => {
    await submitEssayToCloud();
  }, [submitEssayToCloud]);

  // Auto-submit assignment essay function
  const submitAssignmentEssay = useCallback(async () => {
    if (!assignmentData?.isAssignment || !assignmentData.assignmentId || !activeMembership || !currentLocalId) {
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
  }, [assignmentData, activeMembership, currentLocalId, submitEssayToCloud, toast]);

  // Load assignment data if present
  useEffect(() => {
    if (assignmentData?.isAssignment && assignmentData.assignmentTopic) {
      const assignmentTopic: GRETopic = {
        id: 0,
        type: 'issue',
        topic: assignmentData.assignmentTopic,
        instructions: assignmentData.assignmentInstructions || "Complete the assignment as instructed."
      };
      setTopic(assignmentTopic);
      
      // Create new local essay entry for assignment
      const localId = crypto.randomUUID();
      const newEssay: LocalEssay = {
        localId,
        examType: 'GRE',
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
      setCurrentEssayId(null); // Reset cloud ID for new assignment
      return;
    }
  }, [assignmentData, addEssay]);

  // Load continued essay from drafts (only if not an assignment)
  useEffect(() => {
    if (assignmentData?.isAssignment) return;
    
    const continueId = localStorage.getItem('scorewise_continue_essay');
    if (continueId) {
      localStorage.removeItem('scorewise_continue_essay');
      const essayData = getEssay(continueId);
      if (essayData && essayData.examType === 'GRE') {
        setCurrentLocalId(continueId);
        setEssay(essayData.essayText || '');
        if (essayData.cloudId) {
          setCurrentEssayId(essayData.cloudId);
        }
        if (essayData.topic) {
          setTopic({
            id: 0,
            type: 'issue',
            topic: essayData.topic,
            instructions: "Continue your essay."
          });
        }
      }
    }
  }, [assignmentData, getEssay]);

  const handleGenerateTopic = useCallback(() => {
    const newTopic = getRandomTopic(topicType);
    setTopic(newTopic);
    setIsCustomMode(false);
    setCustomTopic("");
    
    // Create new local essay entry
    const localId = crypto.randomUUID();
    const newEssay: LocalEssay = {
      localId,
      examType: 'GRE',
      topic: newTopic.topic,
      essayText: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0
    };
    addEssay(newEssay);
    setCurrentLocalId(localId);
    setEssay('');
    setCurrentEssayId(null); // Reset cloud ID for new essay
  }, [topicType, addEssay]);

  const handleUseCustomTopic = useCallback(() => {
    if (customTopic.trim()) {
      const newTopic = {
        id: 0,
        type: topicType,
        topic: customTopic.trim(),
        instructions: topicType === 'issue' 
          ? "Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning."
          : "Write a response in which you examine the stated and/or unstated assumptions of the argument."
      };
      setTopic(newTopic);
      setIsCustomMode(true);
      
      // Create new local essay entry
      const localId = crypto.randomUUID();
      const newEssay: LocalEssay = {
        localId,
        examType: 'GRE',
        topic: customTopic.trim(),
        essayText: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        wordCount: 0
      };
      addEssay(newEssay);
      setCurrentLocalId(localId);
      setEssay('');
      setCurrentEssayId(null); // Reset cloud ID for new essay
    }
  }, [customTopic, topicType, addEssay]);

  const handleStartTimer = useCallback(() => {
    if (!topic) {
      toast({
        title: "Select a topic first",
        description: "Generate a random topic or enter a custom one before starting.",
        variant: "destructive",
      });
      return;
    }
    setIsTimerRunning(true);
    if (!startTime) {
      setStartTime(Date.now());
    }
    textareaRef.current?.focus();
  }, [topic, startTime, toast]);

  const handleToggleTimer = useCallback(() => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
    } else {
      handleStartTimer();
    }
  }, [isTimerRunning, handleStartTimer]);

  const handleResetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setStartTime(null);
    setWpm(0);
  }, []);

  // Timer end handler - uses unified submit function
  const handleTimeEnd = useCallback(async () => {
    setIsTimerRunning(false);
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

  const handleExport = useCallback(async () => {
    try {
      await exportEssayAsDocx(essay, topic, wordCount);
      toast({
        title: "Essay exported!",
        description: "Your essay has been downloaded as a .docx file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your essay.",
        variant: "destructive",
      });
    }
  }, [essay, topic, wordCount, toast]);

  const handleReset = useCallback(() => {
    // Only reset if user explicitly wants to start over
    // Don't clear essay if it's been submitted or has content
    if (currentEssayId || essay.trim().length > 0) {
      // Ask for confirmation before clearing
      if (!confirm('Are you sure you want to start over? This will clear your current essay.')) {
        return;
      }
    }
    setEssay("");
    setTopic(null);
    setIsTimerRunning(false);
    setStartTime(null);
    setWpm(0);
    setShowResults(false);
    setCustomTopic("");
    setIsCustomMode(false);
    setCurrentLocalId(null);
    setCurrentEssayId(null);
  }, [essay, currentEssayId]);

  const handleFinishEarly = useCallback(async () => {
    setIsTimerRunning(false);
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
  }, [forceSave, submitEssayToCloud, startTime, wordCount]);

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
              AWA Essay Practice
            </h1>
            <p className="text-muted-foreground">
              Simulate real GRE conditions with a 30-minute timer
            </p>
          </div>
          {topic && <SaveStatus status={saveStatus} isSynced={isSynced} />}
        </div>

        {/* Offline indicator */}
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
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Tabs value={topicType} onValueChange={(v) => setTopicType(v as 'issue' | 'argument')}>
                <TabsList>
                  <TabsTrigger value="issue">Issue</TabsTrigger>
                  <TabsTrigger value="argument">Argument</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button onClick={handleGenerateTopic} variant="outline" className="gap-2">
                <Shuffle className="h-4 w-4" />
                Random Topic
              </Button>
            </div>

            {/* Custom Topic Input */}
            <div className="flex gap-2">
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
          <div className="mb-6">
            <TopicCard topic={topic} />
          </div>
        )}

        {/* Timer and Stats Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-card rounded-lg border border-border">
          <Timer
            initialMinutes={30}
            onTimeEnd={handleTimeEnd}
            isRunning={isTimerRunning}
            onToggle={handleToggleTimer}
            onReset={handleResetTimer}
          />
          <EssayStats wordCount={wordCount} wpm={wpm} />
        </div>

        {/* Essay Editor */}
        <div className="mb-6">
          <Textarea
            ref={textareaRef}
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder={isTimerRunning ? "Start typing your essay here..." : essay.trim() ? "Your essay is saved. You can continue editing..." : "Click 'Start' to begin writing..."}
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
          {isTimerRunning && (
            <Button onClick={handleFinishEarly} variant="outline" className="gap-2" disabled={isSubmitting}>
              <CheckCircle2 className="h-4 w-4" />
              Finish Early
            </Button>
          )}
          <AIScorePanel
            essay={essay}
            examType="GRE"
            topic={topic?.topic}
            disabled={isTimerRunning}
            essayId={currentEssayId || undefined}
          />
          <Button onClick={handleExport} variant="secondary" className="gap-2" disabled={!essay.trim()}>
            <Download className="h-4 w-4" />
            Export .docx
          </Button>
          <Button 
            onClick={handleSubmitEssay} 
            className="gap-2" 
            disabled={!essay.trim() || isSubmitting || !topic}
          >
            {isSubmitting ? 'Submitting...' : 'Submit to Cloud'}
          </Button>
          <Button onClick={handleReset} variant="ghost" className="gap-2">
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
              Great job completing your essay practice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{wordCount}</p>
                <p className="text-sm text-muted-foreground">Words Written</p>
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
                    navigate(`/review/${currentEssayId}`);
                  } else {
                    navigate('/drafts');
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

export default Essay;
