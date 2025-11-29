import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
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
import { getRandomTask2Topic, IELTSTask2Topic, task2TypeLabels } from "@/data/ieltsTask2";
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

const STORAGE_KEY = "scorewise_ielts_task2_draft";

const IELTSTask2 = () => {
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const { essays, saveEssays, addEssay, updateEssay, getEssay } = useLocalEssays();
  const { syncEssays, uploadEssay } = useCloudSync();
  const { user, isOnline } = useAuth();
  const { activeMembership } = useInstitution();

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

  const handleGenerateTopic = useCallback(() => {
    const type = topicType === 'all' ? undefined : topicType;
    const newTopic = getRandomTask2Topic(type);
    setTopic(newTopic);
    setCustomTopic("");
  }, [topicType]);

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
    setIsRunning(false);
    setTimeLeft(40 * 60);
    setStartTime(null);
    setWpm(0);
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
        <div className="flex flex-wrap items-center gap-3 mb-6">
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
          
          <Button onClick={handleGenerateTopic} variant="outline" className="gap-2">
            <Shuffle className="h-4 w-4" />
            Random Topic
          </Button>
        </div>

            {/* Custom Topic Input */}
            <div className="flex gap-2 mb-6">
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
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Essay Editor */}
        <div className="mb-6">
          <Textarea
            ref={textareaRef}
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            placeholder="Start writing your essay here..."
            className="essay-editor"
            disabled={showResults}
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
              <Button onClick={handleExport} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Download
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

export default IELTSTask2;
