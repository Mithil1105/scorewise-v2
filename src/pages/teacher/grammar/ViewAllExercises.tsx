import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Search, Edit, Trash2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GrammarExercise, GrammarTopic } from "@/types/grammar";

export default function ViewAllExercises() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<(GrammarExercise & { topic?: GrammarTopic })[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<(GrammarExercise & { topic?: GrammarTopic })[]>([]);
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  useEffect(() => {
    if (activeInstitution) {
      loadExercises();
      loadTopics();
    }
  }, [activeInstitution]);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, topicFilter, difficultyFilter]);

  const loadTopics = async () => {
    if (!activeInstitution) return;

    try {
      const { data } = await supabase
        .from('grammar_topics')
        .select('*')
        .eq('institute_id', activeInstitution.id)
        .order('topic_name');

      if (data) {
        setTopics(data);
      }
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const loadExercises = async () => {
    if (!activeInstitution) return;

    setLoading(true);
    try {
      const { data: exercisesData, error } = await supabase
        .from('grammar_exercises')
        .select('*')
        .eq('institute_id', activeInstitution.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (exercisesData) {
        // Load topics for exercises that have topic_id
        const topicIds = [...new Set(exercisesData.map(ex => ex.topic_id).filter(Boolean))];
        let topicsMap = new Map<string, GrammarTopic>();

        if (topicIds.length > 0) {
          const { data: topicsData } = await supabase
            .from('grammar_topics')
            .select('*')
            .in('id', topicIds);

          if (topicsData) {
            topicsMap = new Map(topicsData.map(t => [t.id, t]));
          }
        }

        const exercisesWithTopics = exercisesData.map(ex => ({
          ...ex,
          topic: ex.topic_id ? topicsMap.get(ex.topic_id) : undefined
        }));

        setExercises(exercisesWithTopics);
        setFilteredExercises(exercisesWithTopics);
      }
    } catch (error: any) {
      console.error("Error loading exercises:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load exercises",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = [...exercises];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.question.toLowerCase().includes(query) ||
        ex.answer.toLowerCase().includes(query) ||
        ex.topic?.topic_name.toLowerCase().includes(query)
      );
    }

    // Topic filter
    if (topicFilter !== "all") {
      if (topicFilter === "none") {
        filtered = filtered.filter(ex => !ex.topic_id);
      } else {
        filtered = filtered.filter(ex => ex.topic_id === topicFilter);
      }
    }

    // Difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(ex => ex.difficulty === parseInt(difficultyFilter));
    }

    setFilteredExercises(filtered);
  };

  const handleDelete = async (exerciseId: string) => {
    if (!confirm("Are you sure you want to delete this exercise?")) return;

    try {
      const { error } = await supabase
        .from('grammar_exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Exercise deleted successfully",
      });

      loadExercises();
    } catch (error: any) {
      console.error("Error deleting exercise:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete exercise",
        variant: "destructive",
      });
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
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/teacher/grammar")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grammar Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Grammar Exercises</CardTitle>
                <CardDescription>
                  View and manage all grammar exercises for your institution ({exercises.length} total)
                </CardDescription>
              </div>
              <Button onClick={() => navigate("/teacher/grammar/quick-add")}>
                <Eye className="h-4 w-4 mr-2" />
                Add New Exercise
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <Select value={topicFilter} onValueChange={setTopicFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    <SelectItem value="none">No Topic (General)</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.topic_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="1">Easy</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exercises Table */}
            {filteredExercises.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">
                  {exercises.length === 0
                    ? "No exercises found. Create your first exercise!"
                    : "No exercises match your filters."}
                </p>
                {exercises.length === 0 && (
                  <Button onClick={() => navigate("/teacher/grammar/quick-add")}>
                    Create Exercise
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Question</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExercises.map((exercise) => (
                      <TableRow key={exercise.id}>
                        <TableCell className="font-medium">
                          <div className="max-w-[300px] truncate" title={exercise.question}>
                            {exercise.question}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={exercise.answer}>
                            {exercise.answer}
                          </div>
                        </TableCell>
                        <TableCell>
                          {exercise.topic ? (
                            <Badge variant="secondary">{exercise.topic.topic_name}</Badge>
                          ) : (
                            <Badge variant="outline">General</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={exercise.difficulty === 1 ? "default" : exercise.difficulty === 2 ? "secondary" : "destructive"}>
                            {exercise.difficulty === 1 ? "Easy" : exercise.difficulty === 2 ? "Medium" : "Hard"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{exercise.source}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(exercise.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exercise.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredExercises.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredExercises.length} of {exercises.length} exercises
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

