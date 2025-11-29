import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, Play, Pause, RotateCcw, CheckCircle2, 
  FileText, ArrowLeft, AlertCircle, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
// We'll render essay components by navigating to them with state
// But keep them in the same view using iframe or by managing state differently

interface Assignment {
  id: string;
  title: string;
  topic: string;
  exam_type: string;
  instructions: string | null;
  image_url: string | null;
  min_word_count: number | null;
  max_word_count: number | null;
}

const CombinedAssignment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { toast } = useToast();
  const { user, isOnline } = useAuth();
  const { activeMembership } = useInstitution();

  const groupData = location.state as {
    groupId: string;
    groupName: string;
    totalTimeMinutes: number;
    assignments: Assignment[];
  } | null;

  const [activeTab, setActiveTab] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [submissions, setSubmissions] = useState<Map<string, { id: string; status: string }>>(new Map());
  const [loadedGroupData, setLoadedGroupData] = useState<typeof groupData>(null);

  useEffect(() => {
    // If we have groupId from URL but no groupData from state, fetch it
    if (groupId && !groupData) {
      fetchGroupData();
      return;
    }

    if (!groupData || !groupData.assignments || groupData.assignments.length === 0) {
      toast({
        title: 'Invalid assignment',
        description: 'Assignment group not found. Redirecting...',
        variant: 'destructive',
      });
      navigate('/institution/student');
      return;
    }

    // Initialize timer
    const totalSeconds = (groupData.totalTimeMinutes || 60) * 60;
    setTimeLeft(totalSeconds);
    
    // Set first assignment as active
    if (groupData.assignments.length > 0) {
      setActiveTab(groupData.assignments[0].id);
    }

    // Fetch existing submissions
    fetchSubmissions();
  }, [groupData, navigate, toast, groupId]);

  const fetchGroupData = async () => {
    if (!groupId || !activeInstitution) return;

    try {
      const { data: groupData, error } = await supabase
        .from('assignment_groups')
        .select(`
          id,
          name,
          total_time_minutes,
          assignments:assignments(
            id,
            title,
            topic,
            exam_type,
            instructions,
            image_url,
            order_in_group
          )
        `)
        .eq('id', groupId)
        .eq('institution_id', activeInstitution.id)
        .single();

      if (error) throw error;

      if (groupData && groupData.assignments) {
        const sortedAssignments = (groupData.assignments as any[]).sort(
          (a, b) => (a.order_in_group || 0) - (b.order_in_group || 0)
        );

        const groupDataState = {
          groupId: groupData.id,
          groupName: groupData.name,
          totalTimeMinutes: groupData.total_time_minutes,
          assignments: sortedAssignments
        };

        // Set as groupData equivalent
        if (sortedAssignments.length > 0) {
          setActiveTab(sortedAssignments[0].id);
          const totalSeconds = (groupData.total_time_minutes || 60) * 60;
          setTimeLeft(totalSeconds);
          fetchSubmissions();
        }
      }
    } catch (err) {
      console.error('Error fetching group data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load assignment group.',
        variant: 'destructive',
      });
      navigate('/institution/student');
    }
  };

  const fetchSubmissions = async () => {
    const dataToUse = groupData || loadedGroupData;
    if (!activeMembership || !dataToUse) return;

    try {
      const dataToUse = groupData || loadedGroupData;
      if (!dataToUse) return;
      const assignmentIds = dataToUse.assignments.map(a => a.id);
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, status')
        .eq('member_id', activeMembership.id)
        .in('assignment_id', assignmentIds);

      if (error) throw error;

      const submissionMap = new Map<string, { id: string; status: string }>();
      data?.forEach(s => {
        submissionMap.set(s.assignment_id, { id: s.id, status: s.status });
      });

      setSubmissions(submissionMap);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setShowResults(true);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleTimeUp = async () => {
    const dataToUse = groupData || loadedGroupData;
    if (!dataToUse || !activeMembership) return;

    // Auto-submit all assignments
    for (const assignment of dataToUse.assignments) {
      await autoSubmitAssignment(assignment);
    }

    toast({
      title: 'Time\'s up!',
      description: 'All assignments have been automatically submitted.',
    });
  };

  const autoSubmitAssignment = async (assignment: Assignment) => {
    if (!activeMembership || !user || !isOnline) return;

    try {
      // Get submission record
      const submission = submissions.get(assignment.id);
      if (!submission) return;

      // Find essay for this assignment (would need to be stored in state)
      // For now, just update submission status
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (error) throw error;
    } catch (err) {
      console.error(`Error submitting assignment ${assignment.id}:`, err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const dataToUse = groupData || loadedGroupData;
    if (!activeMembership || !dataToUse) return;

    // Create submission records for all assignments if they don't exist
    dataToUse.assignments.forEach(async (assignment) => {
      if (!submissions.has(assignment.id)) {
        const { data, error } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: assignment.id,
            member_id: activeMembership.id,
            status: 'in_progress'
          })
          .select()
          .single();

        if (!error && data) {
          setSubmissions(prev => new Map(prev.set(assignment.id, { id: data.id, status: data.status })));
        }
      }
    });

    setIsRunning(true);
    setStartTime(Date.now());
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setStartTime(null);
    const dataToUse = groupData || loadedGroupData;
    const totalSeconds = (dataToUse?.totalTimeMinutes || 60) * 60;
    setTimeLeft(totalSeconds);
    setShowResults(false);
  };

  const dataToUse = groupData || loadedGroupData;

  if (!dataToUse) {
    return (
      <PageLayout>
        <TopBar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  const progress = ((dataToUse.totalTimeMinutes * 60 - timeLeft) / (dataToUse.totalTimeMinutes * 60)) * 100;
  const isLowTime = timeLeft < 300; // 5 minutes

  return (
    <PageLayout>
      <TopBar />
      <div className="px-4 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="gap-2 mb-4"
            onClick={() => navigate('/institution/student')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assignments
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
                {dataToUse.groupName}
              </h1>
              <p className="text-muted-foreground">
                Combined Assignment - {dataToUse.assignments.length} task{dataToUse.assignments.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Timer */}
            <Card className="min-w-[200px]">
              <CardContent className="p-4">
                <div className="flex flex-col items-center gap-2">
                  <div className={`text-3xl font-mono font-bold ${isLowTime ? 'text-destructive' : ''}`}>
                    {formatTime(timeLeft)}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isLowTime ? 'bg-destructive' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    {!isRunning && !showResults && (
                      <Button size="sm" onClick={handleStart} className="gap-2">
                        <Play className="h-4 w-4" />
                        Start
                      </Button>
                    )}
                    {isRunning && (
                      <Button size="sm" variant="outline" onClick={handlePause} className="gap-2">
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    {!showResults && (
                      <Button size="sm" variant="outline" onClick={handleReset} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </div>
                  {showResults && (
                    <Badge variant="destructive" className="mt-2">
                      Time's Up!
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Assignment Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${dataToUse.assignments.length}, 1fr)` }}>
            {dataToUse.assignments.map((assignment, index) => {
              const submission = submissions.get(assignment.id);
              const isCompleted = submission?.status === 'submitted' || submission?.status === 'reviewed';
              
              return (
                <TabsTrigger 
                  key={assignment.id} 
                  value={assignment.id}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {assignment.exam_type === 'IELTS_T1' ? 'Task 1' : 
                     assignment.exam_type === 'IELTS_T2' ? 'Task 2' : 
                     'GRE'}
                  </span>
                  {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {dataToUse.assignments.map((assignment) => {
            const submission = submissions.get(assignment.id);
            
            return (
              <TabsContent key={assignment.id} value={assignment.id} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription>
                      {assignment.exam_type === 'IELTS_T1' ? 'IELTS Task 1' : 
                       assignment.exam_type === 'IELTS_T2' ? 'IELTS Task 2' : 
                       'GRE AWA'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Topic:</h3>
                        <p className="text-muted-foreground">{assignment.topic}</p>
                      </div>
                      {assignment.instructions && (
                        <div>
                          <h3 className="font-semibold mb-2">Instructions:</h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">{assignment.instructions}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          Min: {assignment.min_word_count || 0} words
                        </Badge>
                        {assignment.max_word_count && (
                          <Badge variant="secondary">
                            Max: {assignment.max_word_count} words
                          </Badge>
                        )}
                      </div>
                      {assignment.image_url && (
                        <div>
                          <img 
                            src={assignment.image_url} 
                            alt="Assignment" 
                            className="max-w-full h-auto rounded-lg border"
                          />
                        </div>
                      )}
                      <Button
                        onClick={() => {
                          const route = assignment.exam_type === 'IELTS_T1' 
                            ? '/ielts/task1'
                            : assignment.exam_type === 'IELTS_T2'
                            ? '/ielts/task2'
                            : '/essay';
                          
                          navigate(route, {
                            state: {
                              isAssignment: true,
                              assignmentId: assignment.id,
                              assignmentTitle: assignment.title,
                              assignmentTopic: assignment.topic,
                              assignmentInstructions: assignment.instructions,
                              assignmentImageUrl: assignment.image_url,
                              assignmentMinWords: assignment.min_word_count,
                              assignmentMaxWords: assignment.max_word_count,
                              isClubbed: true,
                              groupId: dataToUse.groupId,
                              sharedTimer: {
                                timeLeft,
                                isRunning,
                                startTime
                              }
                            }
                          });
                        }}
                        className="w-full"
                      >
                        Open {assignment.exam_type === 'IELTS_T1' ? 'Task 1' : 
                               assignment.exam_type === 'IELTS_T2' ? 'Task 2' : 
                               'GRE'} Editor
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default CombinedAssignment;

