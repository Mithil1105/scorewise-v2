import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GrammarSourceType } from "@/types/grammar";

export default function DailySettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [source, setSource] = useState<GrammarSourceType>('predefined');
  const [questionCount, setQuestionCount] = useState(5);
  const [assignTime, setAssignTime] = useState("09:00");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (activeInstitution) {
      loadStudents();
      loadConfig();
    }
  }, [activeInstitution, user]);

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

      // Load existing daily students
      if (user) {
        const { data: dailyStudents } = await supabase
          .from('grammar_daily_students')
          .select('student_id')
          .eq('teacher_id', user.id);

        if (dailyStudents) {
          setSelectedStudents(dailyStudents.map(ds => ds.student_id));
        }
      }
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const loadConfig = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('grammar_daily_config')
        .select('*')
        .eq('teacher_id', user.id)
        .maybeSingle();

      if (data) {
        setSource(data.source);
        setQuestionCount(data.question_count);
        // Parse time from HH:MM:SS to HH:MM
        const timeParts = data.assign_time_utc.split(':');
        setAssignTime(`${timeParts[0]}:${timeParts[1]}`);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    if (selectedStudents.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one student",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Save/update config
      const timeWithSeconds = `${assignTime}:00`;
      
      const { error: configError } = await supabase
        .from('grammar_daily_config')
        .upsert({
          teacher_id: user.id,
          source,
          question_count: questionCount,
          assign_time_utc: timeWithSeconds
        }, {
          onConflict: 'teacher_id'
        });

      if (configError) throw configError;

      // Update daily students
      // First, delete existing
      await supabase
        .from('grammar_daily_students')
        .delete()
        .eq('teacher_id', user.id);

      // Then insert new ones
      const dailyStudentsData = selectedStudents.map(studentId => ({
        teacher_id: user.id,
        student_id: studentId
      }));

      const { error: studentsError } = await supabase
        .from('grammar_daily_students')
        .insert(dailyStudentsData);

      if (studentsError) throw studentsError;

      toast({
        title: "Success",
        description: "Daily practice settings saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
            <CardTitle>Daily Practice Settings</CardTitle>
            <CardDescription>
              Configure daily grammar practice for your students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="source">Source *</Label>
              <Select value={source} onValueChange={(v) => setSource(v as GrammarSourceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="predefined">Global Predefined Bank</SelectItem>
                  <SelectItem value="custom">Institute Custom Bank</SelectItem>
                  <SelectItem value="ai">AI Auto-Generated</SelectItem>
                  <SelectItem value="mixed">Mixed (Predefined + Custom + AI)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionCount">Daily Question Count *</Label>
              <Input
                id="questionCount"
                type="number"
                min="1"
                max="20"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignTime">Assignment Time (UTC) *</Label>
              <Input
                id="assignTime"
                type="time"
                value={assignTime}
                onChange={(e) => setAssignTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Time when daily exercises will be assigned (UTC)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Daily Practice Students *</Label>
              <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
                {students.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No students available
                  </p>
                ) : (
                  students.map((student) => (
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
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/teacher/grammar")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

