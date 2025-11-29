import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
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

const Essay = () => {
  const location = useLocation();
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
  const [essay, setEssay] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [currentLocalId, setCurrentLocalId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const { essays, saveEssays, addEssay, updateEssay, getEssay } = useLocalEssays();
  const { syncEssays, uploadEssay } = useCloudSync();
  const { user, isOnline } = useAuth();
  const { activeMembership } = useInstitution();

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  
  const { saveStatus, forceSave } = useAutoSave(
    essay,
    currentLocalId,
    updateEssay,
    !!topic && essay.length > 0
  );

  // Check if current essay is synced
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
  }, [assignmentData, activeMembership, currentLocalId, essay, getEssay, user, isOnline, uploadEssay, updateEssay, toast]);

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
        setEssay(essayData.essayText);
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

  const handleTimeEnd = useCallback(async () => {
    setIsTimerRunning(false);
    setShowResults(true);
    forceSave();
    
    // Sync to cloud if logged in
    if (user && isOnline) {
      await syncEssays(essays, saveEssays);
    }

    // Auto-submit if this is an assignment
    await submitAssignmentEssay();
  }, [forceSave, user, isOnline, essays, saveEssays, syncEssays, submitAssignmentEssay]);

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
    setEssay("");
    setTopic(null);
    setIsTimerRunning(false);
    setStartTime(null);
    setWpm(0);
    setShowResults(false);
    setCustomTopic("");
    setIsCustomMode(false);
    setCurrentLocalId(null);
  }, []);

  const handleFinishEarly = useCallback(() => {
    setIsTimerRunning(false);
    setShowResults(true);
    forceSave();
    
    // Sync to cloud if logged in
    if (user && isOnline) {
      syncEssays(essays, saveEssays);
    }
  }, [forceSave, user, isOnline, essays, saveEssays, syncEssays]);

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
            placeholder="Start typing your essay here..."
            className="essay-editor"
            disabled={showResults}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {isTimerRunning && (
            <Button onClick={handleFinishEarly} variant="outline" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finish Early
            </Button>
          )}
          <AIScorePanel
            essay={essay}
            examType="GRE"
            topic={topic?.topic}
            disabled={isTimerRunning}
          />
          <Button onClick={handleExport} variant="secondary" className="gap-2" disabled={!essay.trim()}>
            <Download className="h-4 w-4" />
            Export .docx
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
              <Button onClick={handleExport} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Download Essay
              </Button>
              <Button onClick={() => setShowResults(false)} variant="outline" className="flex-1">
                Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Essay;
