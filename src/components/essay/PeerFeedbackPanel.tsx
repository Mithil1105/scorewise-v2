import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Users, Star, MessageSquare, Copy, Check, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PeerFeedback {
  id: string;
  reviewer_user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
}

interface PeerFeedbackPanelProps {
  essayId?: string;
  shareToken?: string;
  onShareTokenGenerated?: (token: string) => void;
}

const PeerFeedbackPanel = ({ essayId, shareToken, onShareTokenGenerated }: PeerFeedbackPanelProps) => {
  const [feedbacks, setFeedbacks] = useState<PeerFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const shareUrl = shareToken 
    ? `${window.location.origin}/review/${shareToken}` 
    : null;

  // Fetch feedback for this essay
  useEffect(() => {
    const fetchFeedback = async () => {
      if (!essayId) return;

      try {
        const { data, error } = await supabase
          .from("peer_feedback")
          .select("*")
          .eq("essay_id", essayId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch reviewer names
        if (data && data.length > 0) {
          const reviewerIds = [...new Set(data.map(f => f.reviewer_user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", reviewerIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
          
          setFeedbacks(data.map(f => ({
            ...f,
            reviewer_name: profileMap.get(f.reviewer_user_id) || "Anonymous"
          })));
        } else {
          setFeedbacks([]);
        }
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
      }
    };

    fetchFeedback();
  }, [essayId]);

  const handleGenerateShareLink = async () => {
    if (!essayId || !user) return;

    setIsLoading(true);
    try {
      // Generate a unique token
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      
      const { error } = await supabase
        .from("essays")
        .update({ share_token: token })
        .eq("id", essayId)
        .eq("user_id", user.id);

      if (error) throw error;

      onShareTokenGenerated?.(token);
      setShowShareDialog(true);
      
      toast({
        title: "Share link created!",
        description: "Anyone with this link can view your essay and leave feedback.",
      });
    } catch (err) {
      toast({
        title: "Failed to create share link",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "Share it with your peers for feedback.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from("peer_feedback")
        .delete()
        .eq("id", feedbackId);

      if (error) throw error;

      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      toast({
        title: "Feedback deleted",
      });
    } catch {
      toast({
        title: "Failed to delete feedback",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`h-4 w-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
          />
        ))}
      </div>
    );
  };

  if (!essayId) return null;

  return (
    <div className="space-y-4">
      {/* Request Feedback Button */}
      <div className="flex items-center gap-3">
        {shareToken ? (
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowShareDialog(true)}
          >
            <Users className="h-4 w-4" />
            View Share Link
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleGenerateShareLink}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            Request Peer Feedback
          </Button>
        )}
        
        {feedbacks.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" />
            {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Feedback List */}
      {feedbacks.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-foreground">Peer Feedback</h4>
          {feedbacks.map(feedback => (
            <div 
              key={feedback.id} 
              className="p-4 bg-muted/50 rounded-lg border border-border space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(feedback.reviewer_name || "A")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{feedback.reviewer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(feedback.rating)}
                  {user && feedback.reviewer_user_id === user.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteFeedback(feedback.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{feedback.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Essay</DialogTitle>
            <DialogDescription>
              Share this link with peers to get feedback on your essay.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareUrl || ""}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border border-border"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view your essay and leave feedback.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PeerFeedbackPanel;