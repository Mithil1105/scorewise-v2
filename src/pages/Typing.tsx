import { useState, useCallback, useEffect, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getRandomPassage } from "@/data/typingPassages";
import { Play, Pause, RotateCcw, Shuffle, FileText, Zap } from "lucide-react";

type TimerDuration = 5 | 10 | 15;

const Typing = () => {
  const [mode, setMode] = useState<'free' | 'copy'>('free');
  const [selectedDuration, setSelectedDuration] = useState<TimerDuration>(5);
  const [timeLeft, setTimeLeft] = useState(selectedDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [text, setText] = useState("");
  const [passage, setPassage] = useState(getRandomPassage());
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const wpm = startTime && wordCount > 0 
    ? Math.round(wordCount / ((Date.now() - startTime) / 60000)) 
    : 0;

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Duration change
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(selectedDuration * 60);
    }
  }, [selectedDuration, isRunning]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    if (!startTime) {
      setStartTime(Date.now());
    }
    textareaRef.current?.focus();
  }, [startTime]);

  const handleToggle = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      handleStart();
    }
  }, [isRunning, handleStart]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(selectedDuration * 60);
    setText("");
    setStartTime(null);
    setShowResults(false);
  }, [selectedDuration]);

  const handleNewPassage = useCallback(() => {
    setPassage(getRandomPassage());
    handleReset();
  }, [handleReset]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <PageLayout>
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
            Typing Practice
          </h1>
          <p className="text-muted-foreground">
            Build typing speed and fluency for the GRE
          </p>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => { setMode(v as 'free' | 'copy'); handleReset(); }}>
          <TabsList className="mb-6">
            <TabsTrigger value="free">Free Writing</TabsTrigger>
            <TabsTrigger value="copy">Copy Text</TabsTrigger>
          </TabsList>

          {/* Duration Selection */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-sm text-muted-foreground">Duration:</span>
            <div className="flex gap-2">
              {[5, 10, 15].map((duration) => (
                <Button
                  key={duration}
                  variant={selectedDuration === duration ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDuration(duration as TimerDuration)}
                  disabled={isRunning}
                >
                  {duration} min
                </Button>
              ))}
            </div>
          </div>

          {/* Timer and Stats */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-4">
              <div className={`timer-display ${timeLeft < 60 ? 'text-destructive animate-pulse-soft' : 'text-foreground'}`}>
                {formatTime(timeLeft)}
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

            <div className="flex gap-4">
              <div className="stat-badge">
                <FileText className="h-4 w-4" />
                <span>{wordCount} words</span>
              </div>
              <div className="stat-badge">
                <Zap className="h-4 w-4" />
                <span>{wpm} WPM</span>
              </div>
            </div>
          </div>

          <TabsContent value="free" className="mt-0">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start typing anything you want... Practice makes perfect!"
              className="essay-editor min-h-[40vh]"
              disabled={showResults}
            />
          </TabsContent>

          <TabsContent value="copy" className="mt-0 space-y-4">
            {/* Passage to copy */}
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">{passage.title}</h3>
                <Button onClick={handleNewPassage} variant="ghost" size="sm" className="gap-2">
                  <Shuffle className="h-4 w-4" />
                  New Passage
                </Button>
              </div>
              <p className="text-foreground leading-relaxed font-serif">{passage.text}</p>
            </div>

            {/* User input */}
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type the passage above..."
              className="essay-editor min-h-[30vh]"
              disabled={showResults}
            />
          </TabsContent>
        </Tabs>

        {/* Results */}
        {showResults && (
          <div className="mt-6 p-6 bg-typing/10 rounded-xl border border-typing/20">
            <h2 className="text-xl font-serif font-bold text-foreground mb-4">Session Complete!</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-card rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{wordCount}</p>
                <p className="text-sm text-muted-foreground">Total Words</p>
              </div>
              <div className="bg-card rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{wpm}</p>
                <p className="text-sm text-muted-foreground">Words/Minute</p>
              </div>
            </div>
            <Button onClick={handleReset} className="w-full gap-2 bg-typing hover:bg-typing/90">
              <RotateCcw className="h-4 w-4" />
              Practice Again
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Typing;
