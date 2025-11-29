import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/hooks/useAdmin";
import { Search, Trash2, Star, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedbackEntry {
  id: string;
  essay_id: string;
  reviewer_user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
  essay_topic?: string;
}

const FeedbackManager = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from("peer_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch reviewer names
        const reviewerIds = [...new Set(data.map(f => f.reviewer_user_id))];
        const essayIds = [...new Set(data.map(f => f.essay_id))];

        const [profilesRes, essaysRes] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name").in("user_id", reviewerIds),
          supabase.from("essays").select("id, topic").in("id", essayIds)
        ]);

        const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p.display_name]) || []);
        const essayMap = new Map(essaysRes.data?.map(e => [e.id, e.topic]) || []);

        setFeedbacks(data.map(f => ({
          ...f,
          reviewer_name: profileMap.get(f.reviewer_user_id) || "Unknown",
          essay_topic: essayMap.get(f.essay_id) || "No topic"
        })));
      } else {
        setFeedbacks([]);
      }
    } catch (err) {
      console.error("Failed to fetch feedbacks:", err);
      toast({
        title: "Error loading feedback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleDeleteFeedback = async (feedbackId: string, reviewerName: string) => {
    try {
      const { error } = await supabase
        .from("peer_feedback")
        .delete()
        .eq("id", feedbackId);

      if (error) throw error;

      if (user) {
        await logAdminAction(user.id, "delete_feedback", feedbackId, {
          reviewer_name: reviewerName
        } as Record<string, string>);
      }

      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      toast({
        title: "Feedback deleted",
        description: `Removed feedback from ${reviewerName}`,
      });
    } catch (err) {
      console.error("Failed to delete feedback:", err);
      toast({
        title: "Failed to delete",
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
            className={`h-3 w-3 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
          />
        ))}
      </div>
    );
  };

  const filteredFeedbacks = feedbacks.filter(f =>
    f.reviewer_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.comment.toLowerCase().includes(search.toLowerCase()) ||
    f.essay_topic?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Feedback Manager">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{feedbacks.length}</p>
                <p className="text-sm text-muted-foreground">Total Feedback</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {feedbacks.length > 0
                    ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
                    : "0.0"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(feedbacks.map(f => f.reviewer_user_id)).size}
                </p>
                <p className="text-sm text-muted-foreground">Active Reviewers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feedback..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Feedback Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No feedback found
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Essay Topic</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="max-w-xs">Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedbacks.map(feedback => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(feedback.reviewer_name || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{feedback.reviewer_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                        {feedback.essay_topic || "—"}
                      </span>
                    </TableCell>
                    <TableCell>{renderStars(feedback.rating)}</TableCell>
                    <TableCell>
                      <span className="text-sm line-clamp-2 max-w-xs">
                        {feedback.comment}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Feedback?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this feedback. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFeedback(feedback.id, feedback.reviewer_name || "Unknown")}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default FeedbackManager;