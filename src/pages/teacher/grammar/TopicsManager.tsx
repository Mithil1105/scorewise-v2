import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { PredefinedTopic, GrammarTopic } from "@/types/grammar";
import { useToast } from "@/hooks/use-toast";

export default function TopicsManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [predefinedTopics, setPredefinedTopics] = useState<PredefinedTopic[]>([]);
  const [instituteTopics, setInstituteTopics] = useState<GrammarTopic[]>([]);

  useEffect(() => {
    loadTopics();
  }, [activeInstitution]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      // Load predefined topics
      const { data: predefined } = await supabase
        .from('predefined_topics')
        .select('*')
        .order('topic_name');

      if (predefined) {
        setPredefinedTopics(predefined);
      }

      // Load institute topics
      if (activeInstitution) {
        const { data: institute } = await supabase
          .from('grammar_topics')
          .select('*')
          .eq('institute_id', activeInstitution.id)
          .order('topic_name');

        if (institute) {
          setInstituteTopics(institute);
        }
      }
    } catch (error) {
      console.error("Error loading topics:", error);
      toast({
        title: "Error",
        description: "Failed to load topics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Grammar Topics</h1>
            <p className="text-muted-foreground">Manage grammar topics for your institute</p>
          </div>
          <Button onClick={() => navigate("/teacher/grammar/topics/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Topic
          </Button>
        </div>

        <Tabs defaultValue="institute" className="w-full">
          <TabsList>
            <TabsTrigger value="predefined">Global Predefined Topics</TabsTrigger>
            <TabsTrigger value="institute">Institute Topics</TabsTrigger>
          </TabsList>

          <TabsContent value="predefined" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Global Predefined Topics</CardTitle>
                <CardDescription>
                  These topics are shared across all institutes and are read-only
                </CardDescription>
              </CardHeader>
              <CardContent>
                {predefinedTopics.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No predefined topics available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {predefinedTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{topic.topic_name}</h3>
                            <Badge variant="secondary">Read-only</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {topic.topic_description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // View exercises for this topic
                            navigate(`/teacher/grammar/topics/predefined/${topic.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Exercises
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="institute" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Institute Topics</CardTitle>
                <CardDescription>
                  Topics created for your institute. You can edit descriptions and manage exercises.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {instituteTopics.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No institute topics yet</p>
                    <Button onClick={() => navigate("/teacher/grammar/topics/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Topic
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {instituteTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{topic.topic_name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {topic.topic_description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/teacher/grammar/topics/institute/${topic.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // View exercises
                              navigate(`/teacher/grammar/topics/institute/${topic.id}/exercises`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Exercises
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}

