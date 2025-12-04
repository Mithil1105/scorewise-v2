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
  task_response: number | null;
  coherence_cohesion: number | null;
  lexical_resource: number | null;
  grammar_range_accuracy: number | null;
  final_band: number;
  word_count: number;
  overall_comment: string;
  feedback: string[];
  improvements: string[];
  remaining?: number;
  // Legacy fields for backward compatibility
  score?: number;
  areas_to_improve?: string[];
  categoryScores?: {
    TaskAchievement: number;
    CoherenceCohesion: number;
    LexicalResource: number;
    GrammarRangeAccuracy: number;
  };
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
  essayId?: string; // Optional: essay ID to save AI review to
  onScoreReceived?: (scoreData: ScoreResult) => void; // Callback when score is received
}

const DAILY_LIMIT = 2;

const AIScorePanel = ({ essay, examType, taskType, topic, imageUrl, disabled, essayId, onScoreReceived }: AIScorePanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingEvaluations, setRemainingEvaluations] = useState<number | null>(null);
  const [isLoadingSavedReview, setIsLoadingSavedReview] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  // Require user to be signed in to use AI scoring
  // For non-admin users, wait until we know the remaining count (don't allow if null/unknown)
  const canScore = !!user && wordCount >= 20 && !disabled && (isAdmin || (remainingEvaluations !== null && remainingEvaluations > 0));

  // Fetch remaining evaluations on mount and when user changes
  useEffect(() => {
    const fetchRemaining = async () => {
      // Require authentication
      if (!user) {
        setRemainingEvaluations(null);
        return;
      }

      // Admins have unlimited access
      if (isAdmin) {
        setRemainingEvaluations(null);
        return;
      }

      try {
        // Call backend API to check daily limit with midnight reset
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setRemainingEvaluations(null);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-daily-limit`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRemainingEvaluations(data.remaining);
        } else {
          // Handle 429 (rate limit) gracefully - don't log as error
          if (response.status === 429) {
            setRemainingEvaluations(0);
          } else {
            // Only log non-429 errors
            try {
              const data = await response.json();
              console.error("Failed to fetch remaining evaluations:", data);
            } catch {
              // Ignore JSON parse errors
            }
            setRemainingEvaluations(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch remaining evaluations:", err);
        setRemainingEvaluations(null);
      }
    };

    fetchRemaining();
  }, [user, isAdmin]);

  // Load saved AI review when essayId is provided
  useEffect(() => {
    const loadSavedReview = async () => {
      if (!essayId || !user) return;

      setIsLoadingSavedReview(true);
      try {
        const { data, error } = await supabase
          .from('essays')
          .select('ai_score, ai_feedback, word_count')
          .eq('id', essayId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading saved AI review:', error);
          setIsLoadingSavedReview(false);
          return;
        }

        if (data && data.ai_score !== null && data.ai_feedback) {
          try {
            const parsedFeedback = typeof data.ai_feedback === 'string' 
              ? JSON.parse(data.ai_feedback) 
              : data.ai_feedback;

            const savedReview: ScoreResult = {
              task_response: parsedFeedback.task_response ?? null,
              coherence_cohesion: parsedFeedback.coherence_cohesion ?? null,
              lexical_resource: parsedFeedback.lexical_resource ?? null,
              grammar_range_accuracy: parsedFeedback.grammar_range_accuracy ?? null,
              final_band: parsedFeedback.final_band ?? data.ai_score ?? 0,
              word_count: data.word_count ?? wordCount, // Use original word count from database, fallback to current
              overall_comment: parsedFeedback.overall_comment || '',
              feedback: parsedFeedback.feedback || [],
              improvements: parsedFeedback.improvements || [],
            };

            setScoreResult(savedReview);
            // Don't auto-show the dialog, let user click to view
          } catch (parseError) {
            console.error('Error parsing saved AI feedback:', parseError);
          }
        }
      } catch (err) {
        console.error('Error loading saved review:', err);
      } finally {
        setIsLoadingSavedReview(false);
      }
    };

    loadSavedReview();
  }, [essayId, user]);

  const handleGetScore = async () => {
    // Require authentication
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use AI scoring.",
        variant: "destructive",
      });
      return;
    }

    if (!canScore) {
      if (remainingEvaluations === 0) {
        toast({
          title: "Daily limit reached",
          description: "You have used all 2 daily AI evaluations. Try again tomorrow at midnight!",
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
      // Get user session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-score`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
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
      
      // Save AI review to essay if essayId is provided
      if (essayId && data) {
        try {
          const aiReviewJson = JSON.stringify({
            task_response: data.task_response ?? null,
            coherence_cohesion: data.coherence_cohesion ?? null,
            lexical_resource: data.lexical_resource ?? null,
            grammar_range_accuracy: data.grammar_range_accuracy ?? null,
            final_band: data.final_band ?? data.score ?? null,
            overall_comment: data.overall_comment || '',
            feedback: data.feedback || [],
            improvements: data.improvements || data.areas_to_improve || [],
          });

          const { error: updateError } = await supabase
            .from('essays')
            .update({
              ai_score: data.final_band ?? data.score ?? null,
              ai_feedback: aiReviewJson,
            })
            .eq('id', essayId);

          if (updateError) {
            console.error('Failed to save AI review:', updateError);
          }
        } catch (err) {
          console.error('Error saving AI review:', err);
        }
      }

      // Call callback if provided
      if (onScoreReceived) {
        onScoreReceived(data);
      }
      
      // Update remaining evaluations from response
      if (data.remaining !== undefined) {
        setRemainingEvaluations(data.remaining);
      } else {
        // Refresh remaining count from backend (with error handling)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const limitResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-daily-limit`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );
            if (limitResponse.ok) {
              const limitData = await limitResponse.json();
              setRemainingEvaluations(limitData.remaining);
            } else if (limitResponse.status === 429) {
              // Rate limited - set to 0 silently
              setRemainingEvaluations(0);
            }
            // Ignore other errors silently
          } catch (err) {
            // Silently ignore fetch errors (network issues, etc.)
          }
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to get score";
      setError(errorMsg);
      toast({
        title: "AI scoring failed",
        description: "AI scoring failed, but your essay is safely saved. You can try again later or continue without AI scoring.",
        variant: "destructive",
      });
      // Essay is safe - don't break anything
      // AI fields remain null, essay text is untouched
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

  const handleViewReview = () => {
    if (scoreResult) {
      setShowResults(true);
    }
  };

  const hasSavedReview = scoreResult !== null;

  return (
    <>
      <div className="flex flex-col gap-1">
        {hasSavedReview ? (
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleViewReview}
              className="gap-2 bg-gradient-to-r from-primary to-essay hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              View AI Review
            </Button>
            <Button
              onClick={handleGetScore}
              disabled={!canScore || isLoading}
              variant="outline"
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isLoading ? "Re-scoring..." : "Re-score Essay"}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGetScore}
            disabled={!canScore || isLoading || isLoadingSavedReview}
            className="gap-2 bg-gradient-to-r from-primary to-essay hover:opacity-90"
          >
            {isLoading || isLoadingSavedReview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isLoading ? "Scoring..." : isLoadingSavedReview ? "Loading..." : "Get AI Score"}
          </Button>
        )}
        {!user && (
          <span className="text-xs text-center text-muted-foreground">
            Sign in to use AI scoring
          </span>
        )}
        {user && !isAdmin && remainingEvaluations !== null && (
          <span className={`text-xs text-center ${remainingEvaluations === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {remainingEvaluations === 0 
              ? "Daily limit reached (resets at midnight)" 
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
                <p className={`text-6xl font-bold ${getScoreColor(scoreResult.final_band ?? scoreResult.score ?? 0)}`}>
                  {(scoreResult.final_band ?? scoreResult.score ?? 0).toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">out of {maxScore}.0</p>
                <Badge className="mt-3" variant="secondary">
                  {getScoreLabel(scoreResult.final_band ?? scoreResult.score ?? 0)}
                </Badge>
              </div>

              {/* IELTS Sub-Scores */}
              {examType === "IELTS" && (
                (scoreResult.task_response !== null || scoreResult.coherence_cohesion !== null || 
                 scoreResult.lexical_resource !== null || scoreResult.grammar_range_accuracy !== null) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2 text-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Band Scores by Criterion
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {scoreResult.task_response !== null && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Task Response</span>
                          <Badge variant="outline" className={getScoreColor(scoreResult.task_response)}>
                            {scoreResult.task_response.toFixed(1)}
                          </Badge>
                        </div>
                      )}
                      {scoreResult.coherence_cohesion !== null && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Coherence & Cohesion</span>
                          <Badge variant="outline" className={getScoreColor(scoreResult.coherence_cohesion)}>
                            {scoreResult.coherence_cohesion.toFixed(1)}
                          </Badge>
                        </div>
                      )}
                      {scoreResult.lexical_resource !== null && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Lexical Resource</span>
                          <Badge variant="outline" className={getScoreColor(scoreResult.lexical_resource)}>
                            {scoreResult.lexical_resource.toFixed(1)}
                          </Badge>
                        </div>
                      )}
                      {scoreResult.grammar_range_accuracy !== null && (
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Grammar & Accuracy</span>
                          <Badge variant="outline" className={getScoreColor(scoreResult.grammar_range_accuracy)}>
                            {scoreResult.grammar_range_accuracy.toFixed(1)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Overall Comment */}
              {scoreResult.overall_comment && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium mb-1 text-blue-700 dark:text-blue-300">AI Summary</p>
                  <p className="text-sm text-muted-foreground">{scoreResult.overall_comment}</p>
                </div>
              )}

              {/* Word Count */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Word Count:</span>
                <Badge variant="outline">{scoreResult.word_count}</Badge>
              </div>

              {/* Feedback */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Strengths
                </h4>
                <ul className="space-y-2">
                  {(scoreResult.feedback || []).map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-green-600 mt-1">✓</span>
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
                  {(scoreResult.improvements || scoreResult.areas_to_improve || []).map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-600 mt-1">→</span>
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