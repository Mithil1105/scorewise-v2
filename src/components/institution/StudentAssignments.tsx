import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, Calendar, Clock, CheckCircle2, 
  Loader2, FileText, AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  topic: string;
  exam_type: string;
  instructions: string | null;
  due_date: string | null;
  min_word_count: number | null;
  max_word_count: number | null;
  image_url: string | null;
  created_at: string;
  group_id?: string | null;
  order_in_group?: number | null;
  group?: {
    id: string;
    name: string;
    total_time_minutes: number;
  } | null;
  submission?: {
    id: string;
    status: string;
    submitted_at: string | null;
    teacher_score: number | null;
    teacher_feedback: string | null;
  };
}

export function StudentAssignments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();
  const [assignments, setAssignments] = useState<Array<Assignment | { isGroup: true; groupId: string; groupName: string; totalTimeMinutes: number; assignments: Assignment[] }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeInstitution && activeMembership) {
      fetchAssignments();
    }
  }, [activeInstitution, activeMembership]);

  const fetchAssignments = async () => {
    if (!activeInstitution || !activeMembership) return;
    setLoading(true);
    try {
      // Fetch all assignments for the institution
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          group:assignment_groups(id, name, total_time_minutes)
        `)
        .eq('institution_id', activeInstitution.id)
        .eq('is_active', true)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (assignmentsError) throw assignmentsError;

      // Fetch student-specific assignments
      const { data: studentAssignments, error: studentAssignmentsError } = await supabase
        .from('assignment_students')
        .select('assignment_id')
        .eq('member_id', activeMembership.id);

      if (studentAssignmentsError) throw studentAssignmentsError;

      const studentAssignmentIds = new Set(studentAssignments?.map(sa => sa.assignment_id) || []);

      // Check which assignments have specific students assigned
      const { data: allStudentAssignments } = await supabase
        .from('assignment_students')
        .select('assignment_id');

      const assignmentsWithSpecificStudents = new Set(
        allStudentAssignments?.map(sa => sa.assignment_id) || []
      );

      // Filter assignments:
      // 1. If assignment has specific students assigned, only show if this student is in the list
      // 2. If assignment has no specific students, show to all (or filter by batch if needed)
      const assignmentsData = (allAssignments || []).filter(assignment => {
        // If this assignment has specific students assigned
        if (assignmentsWithSpecificStudents.has(assignment.id)) {
          // Only show if this student is specifically assigned
          return studentAssignmentIds.has(assignment.id);
        }
        // If assignment has no specific students, show to all students
        // (batch filtering can be added later if needed)
        return true;
      });

      // Fetch submissions for this student
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('member_id', activeMembership.id);

      const submissionMap = new Map(
        submissions?.map(s => [s.assignment_id, s]) || []
      );

      const enrichedAssignments = (assignmentsData || []).map(a => ({
        ...a,
        submission: submissionMap.get(a.id)
      }));

      // Group assignments by group_id
      const groupedMap = new Map<string, Assignment[]>();
      const ungrouped: Assignment[] = [];

      enrichedAssignments.forEach(assignment => {
        if (assignment.group_id && assignment.group) {
          if (!groupedMap.has(assignment.group_id)) {
            groupedMap.set(assignment.group_id, []);
          }
          groupedMap.get(assignment.group_id)!.push(assignment);
        } else {
          ungrouped.push(assignment);
        }
      });

      // Sort grouped assignments by order_in_group
      groupedMap.forEach((assignments) => {
        assignments.sort((a, b) => (a.order_in_group || 0) - (b.order_in_group || 0));
      });

      // Combine grouped and ungrouped assignments
      const finalAssignments: Array<Assignment | { isGroup: true; groupId: string; groupName: string; totalTimeMinutes: number; assignments: Assignment[] }> = [];
      
      // Add grouped assignments
      groupedMap.forEach((assignments, groupId) => {
        const firstAssignment = assignments[0];
        if (firstAssignment?.group) {
          finalAssignments.push({
            isGroup: true,
            groupId,
            groupName: firstAssignment.group.name,
            totalTimeMinutes: firstAssignment.group.total_time_minutes,
            assignments
          });
        }
      });
      
      // Add ungrouped assignments
      ungrouped.forEach(assignment => {
        finalAssignments.push(assignment);
      });

      // Sort by due date
      finalAssignments.sort((a, b) => {
        const aDate = 'isGroup' in a ? (a.assignments[0]?.due_date || '') : (a.due_date || '');
        const bDate = 'isGroup' in b ? (b.assignments[0]?.due_date || '') : (b.due_date || '');
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });

      setAssignments(finalAssignments as any);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const startAssignment = async (assignment: Assignment) => {
    if (!activeMembership) return;

    // Check if this assignment is part of a group
    if (assignment.group_id && assignment.group) {
      // Fetch all assignments in the group
      const { data: groupAssignments, error: groupError } = await supabase
        .from('assignments')
        .select('*')
        .eq('group_id', assignment.group_id)
        .eq('is_active', true)
        .order('order_in_group', { ascending: true });

      if (!groupError && groupAssignments && groupAssignments.length > 1) {
        // Navigate to combined assignment view
        navigate('/institution/combined-assignment', {
          state: {
            groupId: assignment.group_id,
            groupName: assignment.group.name,
            totalTimeMinutes: assignment.group.total_time_minutes,
            assignments: groupAssignments
          }
        });
        return;
      }
    }

    // Create submission record if it doesn't exist
    if (!assignment.submission) {
      await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignment.id,
          member_id: activeMembership.id,
          status: 'in_progress'
        });
    }

    // Navigate to essay page with full assignment context
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
        assignmentDueDate: assignment.due_date
      }
    });
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (!assignment.submission) {
      if (assignment.due_date && isPast(new Date(assignment.due_date))) {
        return <Badge variant="destructive">Overdue</Badge>;
      }
      return <Badge variant="secondary">Not Started</Badge>;
    }

    switch (assignment.submission.status) {
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>;
      case 'reviewed':
        return <Badge className="bg-green-500">Reviewed</Badge>;
      case 'in_progress':
        return <Badge variant="outline">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          My Assignments
        </CardTitle>
        <CardDescription>Essays assigned by your teachers</CardDescription>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No assignments yet</p>
            <p className="text-sm">Your teacher will assign essays here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((item, index) => {
              // Handle grouped assignments
              if ('isGroup' in item && item.isGroup) {
                const groupAssignments = item.assignments;
                const allSubmitted = groupAssignments.every(a => 
                  a.submission?.status === 'submitted' || a.submission?.status === 'reviewed'
                );
                const anyInProgress = groupAssignments.some(a => 
                  a.submission?.status === 'in_progress'
                );
                const firstAssignment = groupAssignments[0];
                const isOverdue = firstAssignment.due_date && 
                  isPast(new Date(firstAssignment.due_date)) && 
                  !allSubmitted;

                return (
                  <div
                    key={item.groupId}
                    className={`p-4 rounded-lg border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{item.groupName}</h3>
                          <Badge variant="outline" className="bg-primary/10">
                            Grouped Assignment
                          </Badge>
                          {allSubmitted && (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {anyInProgress && !allSubmitted && (
                            <Badge variant="outline">In Progress</Badge>
                          )}
                        </div>
                        <div className="space-y-2 mb-3">
                          {groupAssignments.map((assignment, idx) => (
                            <div key={assignment.id} className="pl-4 border-l-2 border-primary/20">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {assignment.exam_type === 'IELTS_T1' ? 'Task 1' : 
                                   assignment.exam_type === 'IELTS_T2' ? 'Task 2' : 
                                   'GRE'}
                                </Badge>
                                <span className="text-sm font-medium">{assignment.title}</span>
                                {assignment.submission?.status === 'submitted' || 
                                 assignment.submission?.status === 'reviewed' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {assignment.topic}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {firstAssignment.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                              {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                              Due: {format(new Date(firstAssignment.due_date), 'MMM d, yyyy h:mm a')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.totalTimeMinutes} minutes total
                          </span>
                        </div>
                      </div>
                      <div>
                        {allSubmitted ? (
                          <Button variant="outline" size="sm" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Completed
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => {
                            navigate('/institution/assignments/group/' + item.groupId, {
                              state: {
                                groupId: item.groupId,
                                groupName: item.groupName,
                                totalTimeMinutes: item.totalTimeMinutes,
                                assignments: groupAssignments
                              }
                            });
                          }}>
                            {anyInProgress ? 'Continue' : 'Start Assignment'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Handle ungrouped assignment
              const assignment = item as Assignment;
              const isOverdue = assignment.due_date && isPast(new Date(assignment.due_date)) && !assignment.submission?.submitted_at;
              
              return (
                <div
                  key={assignment.id}
                  className={`p-4 rounded-lg border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{assignment.title}</h3>
                        {getStatusBadge(assignment)}
                        <Badge variant="outline">{assignment.exam_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {assignment.topic}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {assignment.due_date && (
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                            {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                            Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                            {!isOverdue && !assignment.submission?.submitted_at && (
                              <span className="ml-1">
                                ({formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      
                      {/* Show teacher feedback if reviewed */}
                      {assignment.submission?.teacher_feedback && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Teacher Feedback</span>
                            {assignment.submission.teacher_score && (
                              <Badge variant="secondary">
                                Score: {assignment.submission.teacher_score}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {assignment.submission.teacher_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      {assignment.submission?.status === 'submitted' || assignment.submission?.status === 'reviewed' ? (
                        <Button variant="outline" size="sm" disabled>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Completed
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => startAssignment(assignment)}>
                          {assignment.submission ? 'Continue' : 'Start'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
