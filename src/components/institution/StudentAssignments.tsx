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
      // First fetch assignments without the group join to avoid errors
      const { data: allAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('institution_id', activeInstitution.id)
        .eq('is_active', true)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      // If assignments have group_id, fetch group details separately
      const assignmentsWithGroupIds = (allAssignments || []).filter(a => a.group_id);
      const groupIds = [...new Set(assignmentsWithGroupIds.map(a => a.group_id).filter(Boolean))];
      
      let groupsMap = new Map();
      if (groupIds.length > 0) {
        const { data: groups, error: groupsError } = await supabase
          .from('assignment_groups')
          .select('id, name, total_time_minutes')
          .in('id', groupIds);
        
        if (groupsError) {
          console.warn('Error fetching assignment groups (non-critical):', groupsError);
          // Continue without groups - assignments will still work
        } else if (groups) {
          groupsMap = new Map(groups.map(g => [g.id, g]));
        }
      }

      // Enrich assignments with group data
      const enrichedAssignments = (allAssignments || []).map(assignment => ({
        ...assignment,
        group: assignment.group_id ? groupsMap.get(assignment.group_id) || null : null
      }));

      // Fetch student-specific assignments
      const { data: studentAssignments, error: studentAssignmentsError } = await supabase
        .from('assignment_students')
        .select('assignment_id')
        .eq('member_id', activeMembership.id);

      if (studentAssignmentsError) throw studentAssignmentsError;

      const studentAssignmentIds = new Set(studentAssignments?.map(sa => sa.assignment_id) || []);

      // Check which assignments have specific students assigned
      const assignmentIds = (allAssignments || []).map(a => a.id);
      let allStudentAssignments = null;
      if (assignmentIds.length > 0) {
        const { data } = await supabase
          .from('assignment_students')
          .select('assignment_id')
          .in('assignment_id', assignmentIds);
        allStudentAssignments = data;
      }

      const assignmentsWithSpecificStudents = new Set(
        allStudentAssignments?.map(sa => sa.assignment_id) || []
      );

      // Fetch batches this student belongs to
      const { data: studentBatches } = await supabase
        .from('batch_members')
        .select('batch_id')
        .eq('member_id', activeMembership.id);

      const studentBatchIds = new Set(studentBatches?.map(sb => sb.batch_id) || []);

      // Filter assignments:
      // Priority order:
      // 1. If assignment has specific students assigned (via assignment_students table), only show if this student is in the list
      // 2. If assignment has batch_id, only show if student is in that batch
      // 3. If assignment has no batch_id AND no specific students, show to ALL students (assigned to everyone)
      // This ensures new students can see assignments that were created for "everyone" before they joined
      const assignmentsData = (enrichedAssignments || []).filter(assignment => {
        // First check: If assignment has specific students assigned (entries in assignment_students table)
        // This takes priority - if specific students are assigned, only show to those students
        if (assignmentsWithSpecificStudents.has(assignment.id)) {
          // Only show if this student is specifically assigned
          const isAssigned = studentAssignmentIds.has(assignment.id);
          return isAssigned;
        }
        
        // Second check: If assignment has a batch_id, student must be in that batch
        if (assignment.batch_id) {
          const isInBatch = studentBatchIds.has(assignment.batch_id);
          return isInBatch;
        }
        
        // Third case: Assignment has no batch_id AND no specific students
        // This means it's assigned to "everyone" - show to ALL students in the institution
        // This includes new students who joined after the assignment was created
        return true;
      });
      
      console.log('Assignment filtering debug:', {
        totalAssignments: allAssignments?.length || 0,
        assignmentsWithBatch: (allAssignments || []).filter(a => a.batch_id).length,
        assignmentsWithSpecificStudents: assignmentsWithSpecificStudents.size,
        studentBatchIds: Array.from(studentBatchIds),
        studentAssignmentIds: Array.from(studentAssignmentIds),
        filteredCount: assignmentsData.length
      });

      // Fetch submissions for this student
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('member_id', activeMembership.id);

      const submissionMap = new Map(
        submissions?.map(s => [s.assignment_id, s]) || []
      );

      // Map assignments with their submissions (reusing enrichedAssignments from above)
      const assignmentsWithSubmissions = (assignmentsData || []).map(a => ({
        ...a,
        submission: submissionMap.get(a.id)
      }));

      // Group assignments by group_id
      const groupedMap = new Map<string, Assignment[]>();
      const ungrouped: Assignment[] = [];

      assignmentsWithSubmissions.forEach(assignment => {
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
                          <p className="text-sm text-muted-foreground mb-2">
                            {assignment.submission.teacher_feedback}
                          </p>
                          {assignment.submission.status === 'reviewed' && assignment.submission.essay_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/institution/view-reviewed-essay/${assignment.submission.essay_id}`)}
                              className="mt-2"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Reviewed Essay
                            </Button>
                          )}
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
