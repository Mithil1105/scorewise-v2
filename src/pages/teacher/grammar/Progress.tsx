import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useInstitution } from "@/contexts/InstitutionContext";
import { supabase } from "@/integrations/supabase/client";

export default function Progress() {
  const { activeInstitution } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    if (activeInstitution) {
      loadStudents();
      loadBatches();
    }
  }, [activeInstitution]);

  useEffect(() => {
    if (selectedStudent || selectedBatch) {
      loadProgress();
    }
  }, [selectedStudent, selectedBatch]);

  const loadStudents = async () => {
    if (!activeInstitution) return;
    
    try {
      const { data: members } = await supabase
        .from('institution_members')
        .select(`
          id,
          user_id,
          profiles:user_id (display_name)
        `)
        .eq('institution_id', activeInstitution.id)
        .eq('role', 'student')
        .eq('status', 'active');

      if (members) {
        setStudents(members.map(m => ({
          id: m.user_id,
          name: m.profiles?.display_name || 'Student'
        })));
      }
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

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

  const loadProgress = async () => {
    setLoading(true);
    try {
      let studentIds: string[] = [];

      if (selectedBatch) {
        // Get students in batch
        const { data: batchMembers } = await supabase
          .from('batch_members')
          .select('member_id, institution_members!inner(user_id)')
          .eq('batch_id', selectedBatch);

        if (batchMembers) {
          // Extract user_ids from nested relation
          studentIds = batchMembers
            .map(bm => (bm.institution_members as any)?.user_id)
            .filter(Boolean);
        }
      } else if (selectedStudent) {
        studentIds = [selectedStudent];
      }

      if (studentIds.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      // Get attempts
      const { data: attempts } = await supabase
        .from('grammar_attempts')
        .select('*')
        .in('student_id', studentIds);

      if (attempts) {
        const totalAttempts = attempts.length;
        const correctAttempts = attempts.filter(a => a.is_correct).length;
        const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

        setStats({
          totalAttempts,
          correctAttempts,
          incorrectAttempts: totalAttempts - correctAttempts,
          accuracy: accuracy.toFixed(1)
        });
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold mb-2">Student Progress</h1>
          <p className="text-muted-foreground">View grammar practice performance and analytics</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select a student or batch to view progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Filter by Batch</Label>
                <Select value={selectedBatch} onValueChange={(v) => {
                  setSelectedBatch(v);
                  setSelectedStudent("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Batches</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter by Student</Label>
                <Select value={selectedStudent} onValueChange={(v) => {
                  setSelectedStudent(v);
                  setSelectedBatch("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Students</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : stats ? (
              <div className="grid gap-4 md:grid-cols-4 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Attempts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalAttempts}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Correct</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.correctAttempts}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Incorrect</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.incorrectAttempts}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Accuracy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.accuracy}%</div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a student or batch to view progress
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

