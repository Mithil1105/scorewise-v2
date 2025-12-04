import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GrammarSourceType, GrammarTopicType } from "@/types/grammar";

export default function CreateAssignment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<GrammarSourceType>('predefined');
  const [topicType, setTopicType] = useState<GrammarTopicType>('predefined');
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  
  const [topics, setTopics] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (activeInstitution) {
      loadBatches();
      loadStudents();
    }
    
    // Check for pre-selected exercises from URL
    const exerciseIds = searchParams.get('exerciseIds');
    if (exerciseIds) {
      setSelectedExercises(exerciseIds.split(',').filter(Boolean));
    }
  }, [activeInstitution, searchParams]);

  useEffect(() => {
    if (selectedTopicId && sourceType && topicType) {
      loadExercises();
    }
  }, [selectedTopicId, sourceType, topicType]);

  const loadBatches = async () => {
    if (!activeInstitution) return;
    
    try {
      const { data } = await supabase
        .from('batches')
        .select('*')
        .eq('institution_id', activeInstitution.id)
        .order('name');

      if (data) {
        setBatches(data);
      }
    } catch (error) {
      console.error("Error loading batches:", error);
    }
  };

  const loadStudents = async () => {
    if (!activeInstitution) return;
    
    try {
      const { data: members } = await supabase
        .from('institution_members')
        .select(`
          id,
          user_id,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq('institution_id', activeInstitution.id)
        .eq('role', 'student')
        .eq('status', 'active');

      if (members) {
        setStudents(members.map(m => ({
          id: m.user_id,
          name: m.profiles?.display_name || 'Student',
          memberId: m.id
        })));
      }
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const loadTopics = async () => {
    if (!activeInstitution) return;

    try {
      if (topicType === 'predefined') {
        const { data } = await supabase
          .from('predefined_topics')
          .select('*')
          .order('topic_name');

        if (data) {
          setTopics(data);
        }
      } else {
        const { data } = await supabase
          .from('grammar_topics')
          .select('*')
          .eq('institute_id', activeInstitution.id)
          .order('topic_name');

        if (data) {
          setTopics(data);
        }
      }
    } catch (error) {
      console.error("Error loading topics:", error);
    }
  };

  const loadExercises = async () => {
    if (!selectedTopicId || !activeInstitution) return;

    try {
      if (sourceType === 'predefined' || topicType === 'predefined') {
        const { data } = await supabase
          .from('predefined_exercises')
          .select('*')
          .eq('topic_id', selectedTopicId);

        if (data) {
          setExercises(data);
        }
      } else {
        const { data } = await supabase
          .from('grammar_exercises')
          .select('*')
          .eq('topic_id', selectedTopicId)
          .eq('institute_id', activeInstitution.id);

        if (data) {
          setExercises(data);
        }
      }
    } catch (error) {
      console.error("Error loading exercises:", error);
    }
  };

  useEffect(() => {
    if (sourceType && topicType) {
      loadTopics();
    }
  }, [sourceType, topicType, activeInstitution]);

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

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an assignment title",
        variant: "destructive",
      });
      return;
    }

    if (selectedExercises.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one exercise",
        variant: "destructive",
      });
      return;
    }

    if (selectedBatches.length === 0 && selectedStudents.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one batch or student",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('grammar_manual_assignments')
        .insert({
          teacher_id: user.id,
          institute_id: activeInstitution.id,
          title: title.trim(),
          source_type: sourceType,
          topic_type: topicType,
          topic_id: selectedTopicId || null,
          batch_ids: selectedBatches.length > 0 ? selectedBatches : null,
          student_ids: selectedStudents.length > 0 ? selectedStudents : null,
          exercise_ids: selectedExercises,
          due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment created successfully",
      });

      navigate("/teacher/grammar");
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
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
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create Grammar Assignment</CardTitle>
            <CardDescription>
              Assign grammar exercises to batches or individual students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Assignment Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Articles – Homework 1"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Source Type *</Label>
                <Select value={sourceType} onValueChange={(v) => setSourceType(v as GrammarSourceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="predefined">Predefined</SelectItem>
                    <SelectItem value="custom">Custom (Institute Bank)</SelectItem>
                    <SelectItem value="ai">AI Generated</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Topic Type *</Label>
                <Select value={topicType} onValueChange={(v) => {
                  setTopicType(v as GrammarTopicType);
                  setSelectedTopicId("");
                  setSelectedExercises([]);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="predefined">Predefined Topic</SelectItem>
                    <SelectItem value="institute">Institute Topic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {topics.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="topic">Select Topic *</Label>
                  <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.topic_name || topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {exercises.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Exercises *</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {exercises.map((exercise) => (
                      <div key={exercise.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ex-${exercise.id}`}
                          checked={selectedExercises.includes(exercise.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedExercises([...selectedExercises, exercise.id]);
                            } else {
                              setSelectedExercises(selectedExercises.filter(id => id !== exercise.id));
                            }
                          }}
                        />
                        <Label htmlFor={`ex-${exercise.id}`} className="font-normal cursor-pointer flex-1">
                          {exercise.question}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Batches (Optional)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {batches.map((batch) => (
                    <div key={batch.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`batch-${batch.id}`}
                        checked={selectedBatches.includes(batch.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBatches([...selectedBatches, batch.id]);
                          } else {
                            setSelectedBatches(selectedBatches.filter(id => id !== batch.id));
                          }
                        }}
                      />
                      <Label htmlFor={`batch-${batch.id}`} className="font-normal cursor-pointer">
                        {batch.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Students (Optional)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <Label htmlFor={`student-${student.id}`} className="font-normal cursor-pointer">
                        {student.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
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
                    "Create Assignment"
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

