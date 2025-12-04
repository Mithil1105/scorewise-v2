import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GrammarTopic } from "@/types/grammar";

export default function CreateExercises() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [topicType, setTopicType] = useState<'predefined' | 'institute' | 'none'>('none');
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [instituteTopics, setInstituteTopics] = useState<GrammarTopic[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [assignImmediately, setAssignImmediately] = useState(false);

  useEffect(() => {
    if (activeInstitution && topicType === 'institute') {
      loadInstituteTopics();
    }
  }, [activeInstitution, topicType]);

  const loadInstituteTopics = async () => {
    if (!activeInstitution) return;

    try {
      const { data } = await supabase
        .from('grammar_topics')
        .select('*')
        .eq('institute_id', activeInstitution.id)
        .order('topic_name');

      if (data) {
        setInstituteTopics(data);
      }
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const parseBulkInput = (input: string): Array<{ question: string; answer: string }> => {
    const lines = input.split('\n').filter(line => line.trim());
    const exercises: Array<{ question: string; answer: string }> = [];

    for (const line of lines) {
      // Support both formats:
      // 1. Fill-in-the-blank: "Question -> Answer"
      // 2. MCQ: "Question [A) opt1 B) opt2 C) opt3 D) opt4] -> Answer Letter) Answer Text"
      const arrowMatch = line.match(/^(.+?)\s*->\s*(.+)$/);
      if (arrowMatch) {
        const [, questionPart, answerPart] = arrowMatch;
        exercises.push({
          question: questionPart.trim(),
          answer: answerPart.trim()
        });
      }
    }

    return exercises;
  };

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

    // Topic is optional - no validation needed

    if (!bulkInput.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter exercises",
        variant: "destructive",
      });
      return;
    }

    const exercises = parseBulkInput(bulkInput);
    if (exercises.length === 0) {
      toast({
        title: "Validation Error",
        description: "No valid exercises found. Format: Question -> Answer or Question [A) ... B) ...] -> Answer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const exerciseData = exercises.map(ex => ({
        institute_id: activeInstitution.id,
        topic_id: (topicType === 'institute' && selectedTopicId) ? selectedTopicId : null,
        question: ex.question,
        answer: ex.answer,
        source: 'custom' as const,
        difficulty,
        created_by: user.id
      }));

      const { data: insertedExercises, error } = await supabase
        .from('grammar_exercises')
        .insert(exerciseData)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${insertedExercises.length} exercises successfully`,
      });

      if (assignImmediately && insertedExercises) {
        const exerciseIds = insertedExercises.map(ex => ex.id);
        navigate(`/teacher/grammar/assign?exerciseIds=${exerciseIds.join(',')}`);
      } else {
        navigate("/teacher/grammar/topics");
      }
    } catch (error: any) {
      console.error("Error creating exercises:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create exercises",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/teacher/grammar/exercises")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create Grammar Exercises</CardTitle>
            <CardDescription>
              Add custom exercises in bulk. Format: Question {'->'} Answer (one per line)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Select Topic (Optional)</Label>
                <RadioGroup value={topicType} onValueChange={(v) => {
                  setTopicType(v as 'predefined' | 'institute' | 'none');
                  if (v === 'none') setSelectedTopicId("");
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="font-normal cursor-pointer">
                      No topic (General/Uncategorized)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="institute" id="institute" />
                    <Label htmlFor="institute" className="font-normal cursor-pointer">
                      Institute topic (for linking custom exercises)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {topicType === 'institute' && (
                <div className="space-y-2">
                  <Label htmlFor="topic">Institute Topic</Label>
                  <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {instituteTopics.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No topics available. <a href="/teacher/grammar/topics/new" className="text-primary underline">Create one</a>
                        </div>
                      ) : (
                        instituteTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.topic_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    You can link exercises to a topic later if needed.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulkInput">Exercises (Format: Question {'->'} Answer) *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/teacher/grammar/prompt-generator")}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate with ChatGPT
                  </Button>
                </div>
                <Textarea
                  id="bulkInput"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={`Fill-in-the-blank: I ___ a student. -> am\nMCQ: Choose the correct form: She ___ to school. [A) go B) goes C) going D) went] -> B) goes`}
                  rows={12}
                  required
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Enter one exercise per line. Use &quot;{'-'}{'>'}&quot; to separate question and answer.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports fill-in-the-blank and MCQ formats. For MCQs, format: Question [A) opt1 B) opt2 C) opt3 D) opt4] {'-'}{'>'} Answer Letter) Answer Text
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select value={difficulty.toString()} onValueChange={(v) => setDifficulty(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Easy</SelectItem>
                    <SelectItem value="2">2 - Medium</SelectItem>
                    <SelectItem value="3">3 - Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignImmediately"
                  checked={assignImmediately}
                  onCheckedChange={(checked) => setAssignImmediately(checked as boolean)}
                />
                <Label htmlFor="assignImmediately" className="font-normal cursor-pointer">
                  Assign immediately after creation
                </Label>
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
                    "Create Exercises"
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

