import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function CreateTopic() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [topicDescription, setTopicDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !activeInstitution) {
      toast({
        title: "Error",
        description: "Missing user or institution information",
        variant: "destructive",
      });
      return;
    }

    if (!topicName.trim() || !topicDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('grammar_topics')
        .insert({
          institute_id: activeInstitution.id,
          topic_name: topicName.trim(),
          topic_description: topicDescription.trim(),
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Topic created successfully",
      });

      // Check if we came from quick-add page
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      if (returnTo === 'quick-add') {
        navigate("/teacher/grammar/quick-add");
      } else {
        navigate("/teacher/grammar/topics");
      }
    } catch (error: any) {
      console.error("Error creating topic:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create topic",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/teacher/grammar/topics")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Grammar Topic</CardTitle>
            <CardDescription>
              Add a new grammar topic to your institute's grammar bank
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topicName">Topic Name *</Label>
                <Input
                  id="topicName"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g., Articles (a/an/the)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topicDescription">Topic Description *</Label>
                <Textarea
                  id="topicDescription"
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  placeholder="Write a short explanation paragraph about this grammar topic..."
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This description will be shown to students when they practice this topic.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/teacher/grammar/topics")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Topic"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

