import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, FileText, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GrammarTopic } from "@/types/grammar";

export default function QuickAddExercises() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // Single exercise form
  const [singleExerciseName, setSingleExerciseName] = useState("");
  const [singleQuestion, setSingleQuestion] = useState("");
  const [singleAnswer, setSingleAnswer] = useState("");
  const [singleTopicId, setSingleTopicId] = useState<string>("");
  const [singleDifficulty, setSingleDifficulty] = useState(1);
  const [singleExerciseType, setSingleExerciseType] = useState<'fill-blank' | 'rewrite'>('fill-blank');
  
  // Bulk exercise form
  const [bulkExerciseName, setBulkExerciseName] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [bulkTopicId, setBulkTopicId] = useState<string>("");
  const [bulkDifficulty, setBulkDifficulty] = useState(1);
  
  const [instituteTopics, setInstituteTopics] = useState<GrammarTopic[]>([]);

  useEffect(() => {
    if (activeInstitution) {
      loadInstituteTopics();
    }
  }, [activeInstitution]);

  // Reload topics when returning to this page (e.g., after creating a topic)
  useEffect(() => {
    const handleFocus = () => {
      if (activeInstitution) {
        loadInstituteTopics();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeInstitution]);

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
      // Support multiple formats:
      // 1. Fill-in-the-blank: "Question -> Answer"
      // 2. MCQ: "Question [A) opt1 B) opt2 C) opt3 D) opt4] -> Answer Letter) Answer Text"
      // 3. Rewrite: "Original sentence -> Rewritten sentence"
      const arrowMatch = line.match(/^(.+?)\s*->\s*(.+)$/);
      if (arrowMatch) {
        const [, questionPart, answerPart] = arrowMatch;
        let formattedQuestion = questionPart.trim();
        
        // Check if it's a rewrite exercise (contains full sentence, not a blank)
        // If question doesn't contain "___" or "[A)" pattern, treat as rewrite
        if (!formattedQuestion.includes('___') && !formattedQuestion.includes('[A)')) {
          // Check if it looks like a complete sentence (not a question format)
          if (!formattedQuestion.toLowerCase().startsWith('fill') && 
              !formattedQuestion.toLowerCase().startsWith('choose') &&
              !formattedQuestion.toLowerCase().startsWith('complete') &&
              !formattedQuestion.toLowerCase().includes('convert to')) {
            formattedQuestion = `Rewrite the following sentence: ${formattedQuestion}`;
          }
        }
        
        exercises.push({
          question: formattedQuestion,
          answer: answerPart.trim()
        });
      }
    }

    return exercises;
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !activeInstitution) {
      toast({
        title: "Error",
        description: "Missing user or institution information",
        variant: "destructive",
      });
      return;
    }

    if (!singleExerciseName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an exercise name",
        variant: "destructive",
      });
      return;
    }

    if (!singleQuestion.trim() || !singleAnswer.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both question and answer",
        variant: "destructive",
      });
      return;
    }

    // Format question based on exercise type
    let formattedQuestion = singleQuestion.trim();
    if (singleExerciseType === 'rewrite') {
      formattedQuestion = `Rewrite the following sentence: ${formattedQuestion}`;
    }

    setLoading(true);
    try {
      // First, create the exercise set
      const { data: exerciseSet, error: setError } = await supabase
        .from('grammar_exercise_sets')
        .insert({
          institute_id: activeInstitution.id,
          topic_id: singleTopicId || null,
          title: singleExerciseName.trim(),
          description: null,
          difficulty: singleDifficulty,
          created_by: user.id
        })
        .select()
        .single();

      if (setError) throw setError;

      // Then, add the question to the exercise set
      const { error: questionError } = await supabase
        .from('grammar_questions')
        .insert({
          exercise_set_id: exerciseSet.id,
          question: formattedQuestion,
          answer: singleAnswer.trim(),
          question_order: 0
        });

      if (questionError) throw questionError;

      toast({
        title: "Success",
        description: "Exercise set created successfully",
      });

      // Reload topics to refresh exercise counts
      await loadInstituteTopics();

      // Reset form
      setSingleExerciseName("");
      setSingleQuestion("");
      setSingleAnswer("");
      setSingleTopicId("");
      setSingleDifficulty(1);
      setSingleExerciseType('fill-blank');
    } catch (error: any) {
      console.error("Error creating exercise:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create exercise",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !activeInstitution) {
      toast({
        title: "Error",
        description: "Missing user or institution information",
        variant: "destructive",
      });
      return;
    }

    if (!bulkExerciseName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an exercise name",
        variant: "destructive",
      });
      return;
    }

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
      // First, create the exercise set
      const { data: exerciseSet, error: setError } = await supabase
        .from('grammar_exercise_sets')
        .insert({
          institute_id: activeInstitution.id,
          topic_id: bulkTopicId || null,
          title: bulkExerciseName.trim(),
          description: null,
          difficulty: bulkDifficulty,
          created_by: user.id
        })
        .select()
        .single();

      if (setError) throw setError;

      // Then, add all questions to the exercise set
      const questionData = exercises.map((ex, index) => ({
        exercise_set_id: exerciseSet.id,
        question: ex.question,
        answer: ex.answer,
        question_order: index
      }));

      const { data: insertedQuestions, error: questionError } = await supabase
        .from('grammar_questions')
        .insert(questionData)
        .select();

      if (questionError) throw questionError;

      toast({
        title: "Success",
        description: `Created exercise set "${bulkExerciseName}" with ${insertedQuestions.length} questions successfully`,
      });

      // Reload topics to refresh exercise counts
      await loadInstituteTopics();

      // Reset form
      setBulkExerciseName("");
      setBulkInput("");
      setBulkTopicId("");
      setBulkDifficulty(1);
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
      <div className="px-4 py-6 max-w-4xl mx-auto">
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
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Add Grammar Exercises
            </CardTitle>
            <CardDescription>
              Quickly create grammar exercises for your institution. Topic selection is optional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Single Exercise
                </TabsTrigger>
                <TabsTrigger value="bulk" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Bulk Add
                </TabsTrigger>
              </TabsList>

              {/* Single Exercise Tab */}
              <TabsContent value="single" className="space-y-4 mt-6">
                <form onSubmit={handleSingleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="singleExerciseName">Exercise Name *</Label>
                    <Input
                      id="singleExerciseName"
                      value={singleExerciseName}
                      onChange={(e) => setSingleExerciseName(e.target.value)}
                      placeholder="e.g., Present Simple Practice"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Give a name to this exercise set
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="singleExerciseType">Exercise Type *</Label>
                    <Select value={singleExerciseType} onValueChange={(v) => setSingleExerciseType(v as 'fill-blank' | 'rewrite')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fill-blank">Fill-in-the-Blank</SelectItem>
                        <SelectItem value="rewrite">Rewrite Sentence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="singleQuestion">
                      {singleExerciseType === 'rewrite' ? 'Original Sentence *' : 'Question *'}
                    </Label>
                    {singleExerciseType === 'rewrite' ? (
                      <Textarea
                        id="singleQuestion"
                        value={singleQuestion}
                        onChange={(e) => setSingleQuestion(e.target.value)}
                        placeholder="e.g., The committee will announce the decision tomorrow."
                        rows={3}
                        required
                      />
                    ) : (
                      <Input
                        id="singleQuestion"
                        value={singleQuestion}
                        onChange={(e) => setSingleQuestion(e.target.value)}
                        placeholder="e.g., Fill in the blank: I ___ a student."
                        required
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="singleAnswer">
                      {singleExerciseType === 'rewrite' ? 'Rewritten Sentence *' : 'Answer *'}
                    </Label>
                    <div className="space-y-1">
                      {singleExerciseType === 'rewrite' ? (
                        <Textarea
                          id="singleAnswer"
                          value={singleAnswer}
                          onChange={(e) => setSingleAnswer(e.target.value)}
                          placeholder="e.g., The decision will be announced tomorrow by the committee."
                          rows={3}
                          required
                        />
                      ) : (
                        <Input
                          id="singleAnswer"
                          value={singleAnswer}
                          onChange={(e) => setSingleAnswer(e.target.value)}
                          placeholder="e.g., am or do not|don't (use | to separate multiple correct answers)"
                          required
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {singleExerciseType === 'rewrite' 
                          ? 'Enter the rewritten sentence'
                          : 'Use pipe (|) to separate multiple correct answers, e.g., "do not|don\'t" or "cannot|can\'t"'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="singleTopic">Topic (Optional)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/teacher/grammar/topics/new?returnTo=quick-add")}
                          className="h-6 text-xs"
                        >
                          + Create Topic
                        </Button>
                      </div>
                      <Select value={singleTopicId || "none"} onValueChange={(v) => setSingleTopicId(v === "none" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select topic (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No topic</SelectItem>
                          {instituteTopics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.topic_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="singleDifficulty">Difficulty</Label>
                      <Select 
                        value={singleDifficulty.toString()} 
                        onValueChange={(v) => setSingleDifficulty(parseInt(v))}
                      >
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
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/teacher/grammar")}
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
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Exercise
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Bulk Add Tab */}
              <TabsContent value="bulk" className="space-y-4 mt-6">
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkExerciseName">Exercise Name *</Label>
                    <Input
                      id="bulkExerciseName"
                      value={bulkExerciseName}
                      onChange={(e) => setBulkExerciseName(e.target.value)}
                      placeholder="e.g., Passive Voice Practice Set 1"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Give a name to this exercise set (all questions below will be added to this set)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkInput">Questions (Format: Question {'->'} Answer) *</Label>
                    <Textarea
                      id="bulkInput"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder={`Fill-in-the-blank: I ___ a student. -> am\nShe ___ coffee every morning. (Present simple, negative) -> does not drink|doesn't drink\nMCQ: Choose the correct form: She ___ to school. [A) go B) goes C) going D) went] -> B) goes\nRewrite: The committee will announce the decision tomorrow. -> The decision will be announced tomorrow by the committee.`}
                      rows={10}
                      required
                    />
                      <div className="flex items-start justify-between">
                        <p className="text-xs text-muted-foreground">
                          Enter one exercise per line. Use &quot;{'-'}{'>'}&quot; to separate question and answer.
                          <br />
                          Supports fill-in-the-blank, MCQ, and sentence rewriting formats.
                          <br />
                          <strong>Multiple answers:</strong> Use pipe (|) to separate multiple correct answers, e.g., &quot;do not|don&apos;t&quot;
                        </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/teacher/grammar/prompt-generator")}
                        className="ml-4"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Generate with ChatGPT
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bulkTopic">Topic (Optional)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/teacher/grammar/topics/new?returnTo=quick-add")}
                          className="h-6 text-xs"
                        >
                          + Create Topic
                        </Button>
                      </div>
                      <Select value={bulkTopicId || "none"} onValueChange={(v) => setBulkTopicId(v === "none" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select topic (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No topic</SelectItem>
                          {instituteTopics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.topic_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulkDifficulty">Difficulty</Label>
                      <Select 
                        value={bulkDifficulty.toString()} 
                        onValueChange={(v) => setBulkDifficulty(parseInt(v))}
                      >
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
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/teacher/grammar")}
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
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Create Exercises
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

