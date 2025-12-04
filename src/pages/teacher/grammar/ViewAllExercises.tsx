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
import { ArrowLeft, Loader2, Search, Edit, Trash2, Eye, ChevronDown, ChevronRight, BookOpen, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GrammarTopic, GrammarExerciseSet, GrammarQuestion } from "@/types/grammar";

interface ExerciseSetWithQuestions extends GrammarExerciseSet {
  topic?: GrammarTopic;
  questions: GrammarQuestion[];
}

interface OrganizedData {
  topic_id: string | null;
  topic_name: string;
  exercise_sets: ExerciseSetWithQuestions[];
}

export default function ViewAllExercises() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizedData, setOrganizedData] = useState<OrganizedData[]>([]);
  const [filteredData, setFilteredData] = useState<OrganizedData[]>([]);
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedExerciseSets, setExpandedExerciseSets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeInstitution) {
      loadExercises();
      loadTopics();
    }
  }, [activeInstitution]);

  useEffect(() => {
    filterData();
  }, [organizedData, searchQuery, topicFilter, difficultyFilter]);

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
      // Load all exercise sets
      const { data: exerciseSetsData, error: setsError } = await supabase
        .from('grammar_exercise_sets')
        .select('*')
        .eq('institute_id', activeInstitution.id)
        .order('created_at', { ascending: false });

      if (setsError) throw setsError;

      if (!exerciseSetsData || exerciseSetsData.length === 0) {
        setOrganizedData([]);
        setFilteredData([]);
        setLoading(false);
        return;
      }

      // Load all questions for these exercise sets
      const exerciseSetIds = exerciseSetsData.map(es => es.id);
      const { data: questionsData, error: questionsError } = await supabase
        .from('grammar_questions')
        .select('*')
        .in('exercise_set_id', exerciseSetIds)
        .order('question_order');

      if (questionsError) throw questionsError;

      // Load topics
      const topicIds = [...new Set(exerciseSetsData.map(es => es.topic_id).filter(Boolean))];
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

      // Organize by topic and exercise set
      const organized: Map<string | null, ExerciseSetWithQuestions[]> = new Map();

      exerciseSetsData.forEach(exerciseSet => {
        const questions = (questionsData || []).filter(q => q.exercise_set_id === exerciseSet.id);
        const exerciseSetWithQuestions: ExerciseSetWithQuestions = {
          ...exerciseSet,
          topic: exerciseSet.topic_id ? topicsMap.get(exerciseSet.topic_id) : undefined,
          questions: questions
        };

        const topicKey = exerciseSet.topic_id || null;
        if (!organized.has(topicKey)) {
          organized.set(topicKey, []);
        }
        organized.get(topicKey)!.push(exerciseSetWithQuestions);
      });

      // Convert to array format
      const organizedArray: OrganizedData[] = [];
      
      // Add topics with exercise sets
      organized.forEach((exerciseSets, topicId) => {
        const topic = topicId ? topicsMap.get(topicId) : null;
        organizedArray.push({
          topic_id: topicId,
          topic_name: topic ? topic.topic_name : 'General Exercises',
          exercise_sets: exerciseSets
        });
      });

      // Sort: General Exercises last, then by topic name
      organizedArray.sort((a, b) => {
        if (a.topic_id === null) return 1;
        if (b.topic_id === null) return -1;
        return a.topic_name.localeCompare(b.topic_name);
      });

      setOrganizedData(organizedArray);
      setFilteredData(organizedArray);
      
      // Auto-expand all topics and exercise sets
      const allTopicKeys = organizedArray.map(d => d.topic_id || 'general');
      const allExerciseSetKeys = organizedArray.flatMap(d => d.exercise_sets.map(es => es.id));
      setExpandedTopics(new Set(allTopicKeys));
      setExpandedExerciseSets(new Set(allExerciseSetKeys));
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

  const filterData = () => {
    let filtered = [...organizedData];

    // Topic filter
    if (topicFilter !== "all") {
      if (topicFilter === "none") {
        filtered = filtered.filter(d => d.topic_id === null);
      } else {
        filtered = filtered.filter(d => d.topic_id === topicFilter);
      }
    }

    // Filter exercise sets and questions based on search and difficulty
    const filteredWithSearch: OrganizedData[] = filtered.map(topicData => {
      const filteredSets = topicData.exercise_sets
        .filter(exerciseSet => {
          // Difficulty filter
          if (difficultyFilter !== "all") {
            if (exerciseSet.difficulty !== parseInt(difficultyFilter)) {
              return false;
            }
          }

          // Search filter
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = exerciseSet.title.toLowerCase().includes(query);
            const matchesDescription = exerciseSet.description?.toLowerCase().includes(query) || false;
            const matchesQuestions = exerciseSet.questions.some(q =>
              q.question.toLowerCase().includes(query) ||
              q.answer.toLowerCase().includes(query)
            );
            const matchesTopic = topicData.topic_name.toLowerCase().includes(query);

            if (!matchesTitle && !matchesDescription && !matchesQuestions && !matchesTopic) {
              return false;
            }
          }

          return true;
        })
        .map(exerciseSet => {
          // Filter questions within exercise set if search query exists
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const filteredQuestions = exerciseSet.questions.filter(q =>
              q.question.toLowerCase().includes(query) ||
              q.answer.toLowerCase().includes(query)
            );
            return { ...exerciseSet, questions: filteredQuestions };
          }
          return exerciseSet;
        });

      return {
        ...topicData,
        exercise_sets: filteredSets
      };
    }).filter(topicData => topicData.exercise_sets.length > 0);

    setFilteredData(filteredWithSearch);
  };

  const toggleTopic = (topicId: string | null) => {
    const key = topicId || 'general';
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleExerciseSet = (exerciseSetId: string) => {
    setExpandedExerciseSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseSetId)) {
        newSet.delete(exerciseSetId);
      } else {
        newSet.add(exerciseSetId);
      }
      return newSet;
    });
  };

  const handleDeleteQuestion = async (questionId: string, exerciseSetId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from('grammar_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question deleted successfully",
      });

      loadExercises();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExerciseSet = async (exerciseSetId: string) => {
    if (!confirm("Are you sure you want to delete this exercise set? All questions in it will be deleted.")) return;

    try {
      // Delete questions first (cascade should handle this, but being explicit)
      const { error: questionsError } = await supabase
        .from('grammar_questions')
        .delete()
        .eq('exercise_set_id', exerciseSetId);

      if (questionsError) throw questionsError;

      // Delete exercise set
      const { error } = await supabase
        .from('grammar_exercise_sets')
        .delete()
        .eq('id', exerciseSetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Exercise set deleted successfully",
      });

      loadExercises();
    } catch (error: any) {
      console.error("Error deleting exercise set:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete exercise set",
        variant: "destructive",
      });
    }
  };

  const getTotalQuestions = () => {
    return organizedData.reduce((total, topicData) => {
      return total + topicData.exercise_sets.reduce((sum, es) => sum + es.questions.length, 0);
    }, 0);
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
                  View and manage all grammar exercises for your institution ({getTotalQuestions()} questions in {organizedData.reduce((sum, d) => sum + d.exercise_sets.length, 0)} exercise sets)
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

            {/* Organized Exercises by Topic and Exercise Set */}
            {filteredData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">
                  {organizedData.length === 0
                    ? "No exercises found. Create your first exercise!"
                    : "No exercises match your filters."}
                </p>
                {organizedData.length === 0 && (
                  <Button onClick={() => navigate("/teacher/grammar/quick-add")}>
                    Create Exercise
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredData.map((topicData) => {
                  const topicKey = topicData.topic_id || 'general';
                  const isTopicExpanded = expandedTopics.has(topicKey);
                  
                  return (
                    <Card key={topicKey} className="overflow-hidden">
                      <CardHeader 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleTopic(topicData.topic_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isTopicExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <BookOpen className="h-5 w-5 text-primary" />
                            <div>
                              <CardTitle className="text-lg">{topicData.topic_name}</CardTitle>
                              <CardDescription>
                                {topicData.exercise_sets.length} exercise set{topicData.exercise_sets.length !== 1 ? 's' : ''} • {topicData.exercise_sets.reduce((sum, es) => sum + es.questions.length, 0)} questions
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {isTopicExpanded && (
                        <CardContent className="pt-0">
                          <div className="space-y-3 mt-4">
                            {topicData.exercise_sets.map((exerciseSet) => {
                              const isExerciseSetExpanded = expandedExerciseSets.has(exerciseSet.id);
                              
                              return (
                                <Card key={exerciseSet.id} className="border-l-4 border-l-primary">
                                  <CardHeader 
                                    className="cursor-pointer hover:bg-muted/30 transition-colors py-3"
                                    onClick={() => toggleExerciseSet(exerciseSet.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 flex-1">
                                        {isExerciseSetExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        <FileText className="h-4 w-4 text-primary" />
                                        <div className="flex-1">
                                          <div className="font-semibold">{exerciseSet.title}</div>
                                          {exerciseSet.description && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                              {exerciseSet.description}
                                            </div>
                                          )}
                                          <div className="flex items-center gap-3 mt-2">
                                            <Badge variant={exerciseSet.difficulty === 1 ? "default" : exerciseSet.difficulty === 2 ? "secondary" : "destructive"}>
                                              {exerciseSet.difficulty === 1 ? "Easy" : exerciseSet.difficulty === 2 ? "Medium" : "Hard"}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              {exerciseSet.questions.length} question{exerciseSet.questions.length !== 1 ? 's' : ''}
                                            </span>
                                            {exerciseSet.estimated_time && (
                                              <span className="text-xs text-muted-foreground">
                                                ~{exerciseSet.estimated_time} min
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteExerciseSet(exerciseSet.id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  {isExerciseSetExpanded && exerciseSet.questions.length > 0 && (
                                    <CardContent className="pt-0 pl-8">
                                      <div className="border rounded-lg">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[300px]">Question</TableHead>
                                              <TableHead>Answer</TableHead>
                                              <TableHead>Order</TableHead>
                                              <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {exerciseSet.questions.map((question) => (
                                              <TableRow key={question.id}>
                                                <TableCell className="font-medium">
                                                  <div className="max-w-[300px]" title={question.question}>
                                                    {question.question}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="max-w-[200px]" title={question.answer}>
                                                    {question.answer}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant="outline">{question.question_order + 1}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteQuestion(question.id, exerciseSet.id)}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </CardContent>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {filteredData.length > 0 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredData.reduce((sum, d) => sum + d.exercise_sets.reduce((s, es) => s + es.questions.length, 0), 0)} questions
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

