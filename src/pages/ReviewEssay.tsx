import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Star, Send, Loader2, FileText, ArrowLeft } from "lucide-react";

interface EssayData {
  id: string;
  topic: string | null;
  essay_text: string | null;
  exam_type: string;
  word_count: number | null;
  created_at: string;
}

const ReviewEssay = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [essay, setEssay] = useState<EssayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const fetchEssay = async () => {
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("essays")
          .select("id, topic, essay_text, exam_type, word_count, created_at")
          .eq("share_token", token)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast({
            title: "Essay not found",
            description: "This share link may be invalid or expired.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setEssay(data);

        // Check if user has already submitted feedback
        if (user) {
          const { data: existingFeedback } = await supabase
            .from("peer_feedback")
            .select("id")
            .eq("essay_id", data.id)
            .eq("reviewer_user_id", user.id)
            .maybeSingle();

          if (existingFeedback) {
            setHasSubmitted(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch essay:", err);
        toast({
          title: "Error loading essay",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEssay();
  }, [token, user, navigate, toast]);

  const handleSubmitFeedback = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave feedback.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!essay || rating === 0 || !comment.trim()) {
      toast({
        title: "Incomplete feedback",
        description: "Please provide both a rating and a comment.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("peer_feedback")
        .insert({
          essay_id: essay.id,
          reviewer_user_id: user.id,
          rating,
          comment: comment.trim(),
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already submitted",
            description: "You have already provided feedback for this essay.",
            variant: "destructive",
          });
        } else if (error.message.includes("own essays")) {
          toast({
            title: "Cannot review own essay",
            description: "You cannot leave feedback on your own essay.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      setHasSubmitted(true);
      toast({
        title: "Feedback submitted!",
        description: "Thank you for helping your peer improve.",
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast({
        title: "Failed to submit",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
            This share link may be invalid or expired.
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2 mb-4"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
            Peer Review
          </h1>
          <p className="text-muted-foreground">
            Read the essay and provide constructive feedback
          </p>
        </div>

        {/* Essay Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg font-medium">
                {essay.exam_type} Essay
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  <FileText className="h-3 w-3 mr-1" />
                  {essay.word_count || 0} words
                </Badge>
              </div>
            </div>
            {essay.topic && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                "{essay.topic}"
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {essay.essay_text || "No content available."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Form */}
        {hasSubmitted ? (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="py-6 text-center">
              <p className="text-green-600 font-medium">
                Thank you! You have already submitted feedback for this essay.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leave Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Overall Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Feedback
                </label>
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Provide constructive feedback on the essay's strengths and areas for improvement..."
                  className="min-h-[120px]"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || rating === 0 || !comment.trim()}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Feedback
              </Button>

              {!user && (
                <p className="text-xs text-muted-foreground">
                  You need to{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => navigate("/auth")}
                  >
                    sign in
                  </Button>{" "}
                  to leave feedback.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
};

export default ReviewEssay;