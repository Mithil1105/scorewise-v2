import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Download, Loader2, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportFeedbackAsDocx } from "@/utils/exportFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";

export interface ScoreResult {
  score: number;
  categoryScores?: {
    TaskAchievement: number;
    CoherenceCohesion: number;
    LexicalResource: number;
    GrammarRangeAccuracy: number;
  };
  feedback: string[];
  areas_to_improve: string[];
  word_count: number;
  remaining?: number;
}

interface CategoryScores {
  TaskAchievement: number;
  CoherenceCohesion: number;
  LexicalResource: number;
  GrammarRangeAccuracy: number;
}

interface AIScorePanelProps {
  essay: string;
  examType: "GRE" | "IELTS";
  taskType?: "task1" | "task2";
  topic?: string;
  imageUrl?: string; // Cloud URL for Task 1 images
  disabled?: boolean;
}

const DAILY_LIMIT = 3;

const AIScorePanel = ({ essay, examType, taskType, topic, imageUrl, disabled }: AIScorePanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingEvaluations, setRemainingEvaluations] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const canScore = wordCount >= 20 && !disabled && (isAdmin || remainingEvaluations === null || remainingEvaluations > 0);

  // Fetch remaining evaluations on mount and when user changes
  useEffect(() => {
    const fetchRemaining = async () => {
      if (!user || isAdmin) {
        setRemainingEvaluations(null);
        return;
      }

      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
          .from("ai_usage_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("action", "ai_score")
          .gte("created_at", twentyFourHoursAgo);

        if (!error && count !== null) {
          setRemainingEvaluations(Math.max(0, DAILY_LIMIT - count));
        }
      } catch (err) {
        console.error("Failed to fetch remaining evaluations:", err);
      }
    };

    fetchRemaining();
  }, [user, isAdmin]);

  const handleGetScore = async () => {
    if (!canScore) {
      if (remainingEvaluations === 0) {
        toast({
          title: "Daily limit reached",
          description: "You have used all 3 daily AI evaluations. Try again tomorrow!",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Essay too short",
          description: "Please write at least 20 words to receive a score.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-score`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            essay,
            examType,
            taskType,
            topic,
            ...(imageUrl && { imageUrl }),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setRemainingEvaluations(0);
          throw new Error(data.message || "Daily limit reached. Try again tomorrow!");
        }
        if (response.status === 402) {
          throw new Error("AI credits exhausted. Please add funds to continue.");
        }
        throw new Error(data.message || "Failed to score essay");
      }

      setScoreResult(data);
      setShowResults(true);
      
      // Update remaining evaluations from response
      if (data.remaining !== undefined) {
        setRemainingEvaluations(data.remaining);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to get score";
      setError(errorMsg);
      toast({
        title: "Scoring failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportFeedback = async () => {
    if (!scoreResult) return;
    try {
      await exportFeedbackAsDocx(scoreResult, examType, taskType, topic, essay);
      toast({
        title: "Feedback exported!",
        description: "Your AI feedback has been downloaded.",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not export feedback.",
        variant: "destructive",
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (examType === "GRE") {
      if (score >= 5) return "text-green-600";
      if (score >= 4) return "text-yellow-600";
      return "text-orange-600";
    } else {
      if (score >= 7) return "text-green-600";
      if (score >= 5.5) return "text-yellow-600";
      return "text-orange-600";
    }
  };

  const getScoreLabel = (score: number) => {
    if (examType === "GRE") {
      if (score >= 5.5) return "Excellent";
      if (score >= 4.5) return "Good";
      if (score >= 3.5) return "Adequate";
      return "Needs Work";
    } else {
      if (score >= 7.5) return "Expert";
      if (score >= 6.5) return "Competent";
      if (score >= 5) return "Modest";
      return "Developing";
    }
  };

  const maxScore = examType === "GRE" ? 6 : 9;

  return (
    <>
      <div className="flex flex-col gap-1">
        <Button
          onClick={handleGetScore}
          disabled={!canScore || isLoading}
          className="gap-2 bg-gradient-to-r from-primary to-essay hover:opacity-90"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isLoading ? "Scoring..." : "Get AI Score"}
        </Button>
        {user && !isAdmin && remainingEvaluations !== null && (
          <span className={`text-xs text-center ${remainingEvaluations === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {remainingEvaluations === 0 
              ? "Daily limit reached" 
              : `${remainingEvaluations}/${DAILY_LIMIT} evaluations left today`}
          </span>
        )}
        {isAdmin && (
          <span className="text-xs text-center text-primary">Unlimited (Admin)</span>
        )}
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Score & Review
            </DialogTitle>
            <DialogDescription>
              Automated scoring for {examType} {taskType ? `Writing ${taskType === 'task1' ? 'Task 1' : 'Task 2'}` : 'AWA'}
            </DialogDescription>
          </DialogHeader>

          {scoreResult && (
            <div className="space-y-6 py-4">
              {/* Score Display */}
              <div className="text-center p-6 bg-gradient-to-br from-muted to-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground mb-2">Your Score</p>
                <p className={`text-6xl font-bold ${getScoreColor(scoreResult.score)}`}>
                  {scoreResult.score.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">out of {maxScore}.0</p>
                <Badge className="mt-3" variant="secondary">
                  {getScoreLabel(scoreResult.score)}
                </Badge>
              </div>

              {/* Word Count */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Word Count:</span>
                <Badge variant="outline">{scoreResult.word_count}</Badge>
              </div>

              {/* Category Scores for Task 1 */}
              {scoreResult.categoryScores && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Band Scores by Criterion
                  </h4>
                  <div className="grid gap-2">
                    {Object.entries(scoreResult.categoryScores).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">
                          {key === 'TaskAchievement' ? 'Task Achievement' :
                           key === 'CoherenceCohesion' ? 'Coherence & Cohesion' :
                           key === 'LexicalResource' ? 'Lexical Resource' :
                           key === 'GrammarRangeAccuracy' ? 'Grammar Range & Accuracy' : key}
                        </span>
                        <Badge variant="outline" className={getScoreColor(value)}>
                          {value.toFixed(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Feedback
                </h4>
                <ul className="space-y-2">
                  {scoreResult.feedback.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to Improve */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  Areas to Improve
                </h4>
                <ul className="space-y-2">
                  {scoreResult.areas_to_improve.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-600 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>This is automated scoring and may not fully reflect official results.</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleExportFeedback} variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Download Feedback
                </Button>
                <Button onClick={() => setShowResults(false)} className="flex-1">
                  Close
                </Button>
              </div>

              {/* Footer */}
              <p className="text-center text-xs text-muted-foreground">
                Scoring powered by Google Gemini — Integrated by Mithil & Hasti
              </p>
            </div>
          )}

          {error && !scoreResult && (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive">{error}</p>
              <Button onClick={() => setShowResults(false)} className="mt-4">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIScorePanel;