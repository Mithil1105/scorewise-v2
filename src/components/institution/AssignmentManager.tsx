import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Loader2, ClipboardList, Calendar, Users, 
  FileText, MoreHorizontal, Eye, Trash2, Clock, 
  BookOpen, GraduationCap, Sparkles, Info, Image as ImageIcon, X, Search, Check, CheckCircle2, CheckSquare, XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { getAllTopics, GRETopic } from '@/data/greTopics';
import { ieltsTask1Questions, IELTSTask1Question } from '@/data/ieltsTask1';
import { ieltsTask2Topics, IELTSTask2Topic } from '@/data/ieltsTask2';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface Assignment {
  id: string;
  institution_id: string;
  batch_id: string | null;
  created_by: string;
  title: string;
  topic: string;
  exam_type: string;
  instructions: string | null;
  due_date: string | null;
  max_word_count: number | null;
  min_word_count: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  batch?: { name: string };
  submissionCount?: number;
  group_id?: string | null;
  order_in_group?: number | null;
  group?: {
    id: string;
    name: string;
    total_time_minutes: number;
  } | null;
}

interface Batch {
  id: string;
  name: string;
}

interface Student {
  id: string;
  user_id: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Submission {
  id: string;
  member_id: string;
  status: string;
  submitted_at: string | null;
  teacher_feedback: string | null;
  teacher_score: number | null;
  reviewed_at: string | null;
  essay_id?: string | null;
  member?: {
    user_id: string;
    profile?: {
      display_name: string | null;
      avatar_url?: string | null;
    } | null;
  } | null;
  essay?: {
    id: string;
    essay_text: string;
    word_count: number;
  } | null;
}

export function AssignmentManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Array<Assignment | { isGroup: boolean; groupId?: string; assignments: Assignment[] }>>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [exerciseSetSearchTerm, setExerciseSetSearchTerm] = useState('');
  const [viewSubmissionsOpen, setViewSubmissionsOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmissionDetails, setSelectedSubmissionDetails] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [scoreOverride, setScoreOverride] = useState<{ [questionId: string]: boolean }>({});
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<{ attemptId: string; newStatus: boolean; question: any } | null>(null);
  const [updateAnswerScope, setUpdateAnswerScope] = useState<'global' | 'per-student' | 'skip'>('skip');

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    topic: '',
    exam_type: 'GRE',
    task_type: '', // For IELTS Task 1 (bar-chart, line-graph, etc.)
    instructions: '',
    due_date: '',
    due_time: '',
    batch_id: '',
    use_predefined_topic: false,
    selected_topic_id: '',
    image_url: '',
    grammar_exercise_set_ids: [] as string[] // For grammar exercises
  });
  

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableTopics, setAvailableTopics] = useState<GRETopic[] | IELTSTask1Question[] | IELTSTask2Topic[]>([]);
  const [availableGrammarExerciseSets, setAvailableGrammarExerciseSets] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (activeInstitution) {
      fetchAssignments();
      fetchBatches();
      fetchStudents();
    }
  }, [activeInstitution]);

  const fetchStudents = async () => {
    if (!activeInstitution) return;
    try {
      // Fetch members first
      const { data: membersData, error: membersError } = await supabase
        .from('institution_members')
        .select('id, user_id')
        .eq('institution_id', activeInstitution.id)
        .eq('role', 'student')
        .eq('status', 'active');

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch profiles separately
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Combine data
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const studentsData = membersData.map(member => ({
        id: member.id,
        user_id: member.user_id,
        profile: profileMap.get(member.user_id) || null
      }));

      setStudents(studentsData as Student[]);
    } catch (err) {
      console.error('Error fetching students:', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to load students. Please refresh the page.',
        variant: 'destructive' 
      });
    }
  };

  // Load topics based on exam type
  useEffect(() => {
    if (newAssignment.exam_type === 'GRE') {
      setAvailableTopics(getAllTopics());
      setAvailableGrammarExerciseSets([]);
    } else if (newAssignment.exam_type === 'IELTS_T1') {
      setAvailableTopics(ieltsTask1Questions);
      setAvailableGrammarExerciseSets([]);
    } else if (newAssignment.exam_type === 'IELTS_T1_General') {
      // General Task 1 uses custom topics, so no predefined topics needed
      setAvailableTopics([]);
      setAvailableGrammarExerciseSets([]);
    } else if (newAssignment.exam_type === 'IELTS_T2') {
      setAvailableTopics(ieltsTask2Topics);
      setAvailableGrammarExerciseSets([]);
    } else if (newAssignment.exam_type === 'GRAMMAR') {
      setAvailableTopics([]);
      loadGrammarExerciseSets();
    } else {
      setAvailableTopics([]);
      setAvailableGrammarExerciseSets([]);
    }
    
    // Reset topic selection when exam type changes
    setNewAssignment(prev => ({
      ...prev,
      selected_topic_id: '',
      topic: '',
      instructions: '',
      task_type: '',
      grammar_exercise_set_ids: []
    }));
  }, [newAssignment.exam_type, activeInstitution]);

  // Load grammar exercise sets
  const loadGrammarExerciseSets = async () => {
    if (!activeInstitution) return;
    
    try {
      const { data, error } = await supabase
        .from('grammar_exercise_sets')
        .select('id, title, description, difficulty, topic_id, grammar_topics:topic_id(topic_name)')
        .eq('institute_id', activeInstitution.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setAvailableGrammarExerciseSets(data);
      }
    } catch (error) {
      console.error('Error loading grammar exercise sets:', error);
    }
  };

  // Handle predefined topic selection
  useEffect(() => {
    if (newAssignment.selected_topic_id && newAssignment.use_predefined_topic && availableTopics.length > 0) {
      const selected = availableTopics.find(t => {
        if (newAssignment.exam_type === 'GRE') {
          return (t as GRETopic).id.toString() === newAssignment.selected_topic_id;
        } else if (newAssignment.exam_type === 'IELTS_T1') {
          return (t as IELTSTask1Question).id === newAssignment.selected_topic_id;
        } else {
          return (t as IELTSTask2Topic).id === newAssignment.selected_topic_id;
        }
      });

      if (selected) {
        if (newAssignment.exam_type === 'GRE') {
          const greTopic = selected as GRETopic;
          setNewAssignment(prev => ({
            ...prev,
            topic: greTopic.topic,
            instructions: greTopic.instructions
          }));
        } else if (newAssignment.exam_type === 'IELTS_T1') {
          const task1 = selected as IELTSTask1Question;
          setNewAssignment(prev => ({
            ...prev,
            topic: task1.description,
            instructions: task1.instructions,
            task_type: task1.type
          }));
        } else {
          const task2 = selected as IELTSTask2Topic;
          setNewAssignment(prev => ({
            ...prev,
            topic: task2.topic,
            instructions: task2.instructions
          }));
        }
      }
    }
  }, [newAssignment.selected_topic_id, newAssignment.use_predefined_topic, newAssignment.exam_type, availableTopics]);

  // Handle date selection
  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setNewAssignment(prev => ({ ...prev, due_date: dateStr }));
    }
  }, [selectedDate]);

  const fetchAssignments = async () => {
    if (!activeInstitution) return;
    setLoading(true);
    try {
      // Fetch regular assignments
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          batch:batches(name)
        `)
        .eq('institution_id', activeInstitution.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch grammar manual assignments
      const { data: grammarAssignments, error: grammarError } = await supabase
        .from('grammar_manual_assignments')
        .select('*')
        .eq('institute_id', activeInstitution.id)
        .order('created_at', { ascending: false });

      if (grammarError) {
        console.error('Error fetching grammar assignments:', grammarError);
      }

      // Convert grammar assignments to match Assignment interface
      const convertedGrammarAssignments: Assignment[] = (grammarAssignments || []).map(ga => ({
        id: ga.id,
        institution_id: ga.institute_id,
        batch_id: null,
        created_by: ga.teacher_id,
        title: ga.title,
        topic: 'Grammar Exercise',
        exam_type: 'GRAMMAR',
        instructions: null,
        due_date: ga.due_date,
        max_word_count: null,
        min_word_count: null,
        image_url: null,
        is_active: true,
        created_at: ga.created_at,
        batch: null,
        submissionCount: 0 // Will be fetched below
      }));

      // Combine regular and grammar assignments
      const allAssignments = [...(data || []), ...convertedGrammarAssignments];

      // Fetch submission counts for regular assignments
      const regularAssignmentIds = (data || []).map(a => a.id);
      const countMap = new Map<string, number>();
      
      if (regularAssignmentIds.length > 0) {
        const { data: submissions } = await supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .in('assignment_id', regularAssignmentIds);

        submissions?.forEach(s => {
          countMap.set(s.assignment_id, (countMap.get(s.assignment_id) || 0) + 1);
        });
      }

      // Fetch submission counts for grammar assignments (from grammar_attempts)
      const grammarAssignmentIds = (grammarAssignments || []).map(ga => ga.id);
      const grammarCountMap = new Map<string, number>();
      
      if (grammarAssignmentIds.length > 0) {
        // Count unique students who have attempted questions from these assignments
        const { data: grammarAttempts } = await supabase
          .from('grammar_attempts')
          .select('assignment_id, student_id')
          .eq('assignment_type', 'manual')
          .in('assignment_id', grammarAssignmentIds);

        const uniqueSubmissions = new Map<string, Set<string>>();
        grammarAttempts?.forEach(attempt => {
          if (attempt.assignment_id) {
            if (!uniqueSubmissions.has(attempt.assignment_id)) {
              uniqueSubmissions.set(attempt.assignment_id, new Set());
            }
            uniqueSubmissions.get(attempt.assignment_id)!.add(attempt.student_id);
          }
        });

        uniqueSubmissions.forEach((students, assignmentId) => {
          grammarCountMap.set(assignmentId, students.size);
        });
      }

      // Filter out invalid assignments and enrich with submission counts
      const enrichedAssignments = allAssignments
        .filter(a => a && a.id && a.title) // Only include valid assignments (grammar assignments have topic set)
        .map(a => ({
          ...a,
          submissionCount: a.exam_type === 'GRAMMAR' 
            ? (grammarCountMap.get(a.id) || 0)
            : (countMap.get(a.id) || 0)
        }));

      // Sort by created_at descending
      enrichedAssignments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setAssignments(enrichedAssignments as any);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    if (!activeInstitution) return;
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name')
        .eq('institution_id', activeInstitution.id)
        .eq('is_active', true);

      if (error) throw error;
      setBatches(data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file (PNG, JPG, JPEG)', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 5MB', variant: 'destructive' });
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setNewAssignment(prev => ({ ...prev, image_url: '' }));
  };

  const uploadImageToStorage = async (file: File, assignmentId: string): Promise<string | null> => {
    if (!user || !activeInstitution) return null;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `assignments/${activeInstitution.id}/${assignmentId}/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assignment_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('assignment_images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Image upload error:', err);
      toast({ 
        title: 'Image upload failed', 
        description: err.message || 'Failed to upload image. Assignment will be created without image.',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const createAssignment = async () => {
    if (!activeInstitution || !user) {
      toast({ title: 'Error', description: 'Missing institution or user information', variant: 'destructive' });
      return;
    }
    
    // Validate assignment
      if (!newAssignment.title.trim()) {
        toast({ title: 'Error', description: 'Please enter an assignment title', variant: 'destructive' });
        return;
      }
      
      // Skip topic validation for grammar exercises
      if (newAssignment.exam_type !== 'GRAMMAR' && !newAssignment.topic.trim()) {
        toast({ title: 'Error', description: 'Please enter or select a topic', variant: 'destructive' });
        return;
      }
    
    setSaving(true);
    try {
      // Combine date and time for due_date
      let dueDateISO: string | null = null;
      if (newAssignment.due_date) {
        try {
          if (newAssignment.due_time) {
            const dateTime = new Date(`${newAssignment.due_date}T${newAssignment.due_time}`);
            if (isNaN(dateTime.getTime())) {
              throw new Error('Invalid date or time format');
            }
            dueDateISO = dateTime.toISOString();
          } else {
            const dateTime = new Date(`${newAssignment.due_date}T23:59`);
            if (isNaN(dateTime.getTime())) {
              throw new Error('Invalid date format');
            }
            dueDateISO = dateTime.toISOString();
          }
        } catch (dateError) {
          console.error('Date parsing error:', dateError);
          toast({ title: 'Error', description: 'Invalid date or time. Please check your selection.', variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      // Regular single assignment creation
      // Create assignment first (we need the ID for image path)
      // Ensure batch_id is properly handled
      const batchIdValue = newAssignment.batch_id && newAssignment.batch_id.trim() && newAssignment.batch_id !== 'all' 
        ? newAssignment.batch_id.trim() 
        : null;

      // Handle grammar exercise assignments differently
      if (newAssignment.exam_type === 'GRAMMAR') {
        if (newAssignment.grammar_exercise_set_ids.length === 0) {
          toast({
            title: 'Validation Error',
            description: 'Please select at least one grammar exercise set',
            variant: 'destructive'
          });
          return;
        }

        // Create grammar manual assignment
        const { data: grammarAssignment, error: grammarError } = await supabase
          .from('grammar_manual_assignments')
          .insert({
            teacher_id: user.id,
            institute_id: activeInstitution.id,
            title: newAssignment.title.trim(),
            source_type: 'custom',
            topic_type: 'institute',
            topic_id: null,
            batch_ids: batchIdValue ? [batchIdValue] : null,
            student_ids: selectedStudentIds.length > 0 ? selectedStudentIds.map(id => {
              // Convert member_id to user_id
              const student = students.find(s => s.id === id);
              return student?.user_id;
            }).filter(Boolean) as string[] : null,
            exercise_ids: [], // Empty array for backward compatibility (deprecated field)
            exercise_set_ids: newAssignment.grammar_exercise_set_ids,
            due_date: dueDateISO ? dueDateISO.split('T')[0] : null
          })
          .select()
          .single();

        if (grammarError) throw grammarError;

        toast({ title: 'Grammar Assignment created!', description: 'Students can now see and complete this assignment.' });
        
        // Reset form
        const resetForm = {
          title: '',
          topic: '',
          exam_type: 'GRE',
          task_type: '',
          instructions: '',
          due_date: '',
          due_time: '',
          batch_id: '',
          use_predefined_topic: false,
          selected_topic_id: '',
          image_url: '',
          grammar_exercise_set_ids: []
        };
        setNewAssignment(resetForm);
        setSelectedDate(undefined);
        setImageFile(null);
        setSelectedStudentIds([]);
        setExerciseSetSearchTerm('');
        setCreateOpen(false);
        fetchAssignments();
        return;
      }

      const { data: assignmentData, error } = await supabase
        .from('assignments')
        .insert({
          institution_id: activeInstitution.id,
          created_by: user.id,
          title: newAssignment.title.trim(),
          topic: newAssignment.topic.trim(),
          exam_type: newAssignment.exam_type,
          instructions: newAssignment.instructions.trim() || null,
          due_date: dueDateISO,
          batch_id: batchIdValue,
          image_url: newAssignment.image_url || null
        })
        .select()
        .single();

      if (error) throw error;

      // Upload image if provided
      let imageUrl = newAssignment.image_url || null;
      if (imageFile && assignmentData) {
        const uploadedUrl = await uploadImageToStorage(imageFile, assignmentData.id);
        if (uploadedUrl) {
          // Update assignment with image URL
          const { error: updateError } = await supabase
            .from('assignments')
            .update({ image_url: uploadedUrl })
            .eq('id', assignmentData.id);
          
          if (updateError) {
            console.error('Error updating assignment with image URL:', updateError);
          } else {
            imageUrl = uploadedUrl;
          }
        }
      }

      // Assign to specific students if selected
      if (selectedStudentIds.length > 0) {
        const studentAssignments = selectedStudentIds
          .filter(memberId => memberId && typeof memberId === 'string' && memberId.trim())
          .map(memberId => ({
            assignment_id: assignmentData.id,
            member_id: memberId.trim()
          }));

        const { error: studentAssignError } = await supabase
          .from('assignment_students')
          .insert(studentAssignments);

        if (studentAssignError) {
          console.error('Error assigning to students:', studentAssignError);
          toast({ 
            title: 'Warning', 
            description: 'Assignment created but some student assignments failed. You can assign manually later.',
            variant: 'destructive' 
          });
        }
      }

      toast({ title: 'Assignment created!', description: 'Students can now see and submit this assignment.' });
      
      // Reset form
      const resetForm = {
        title: '',
        topic: '',
        exam_type: 'GRE',
        task_type: '',
        instructions: '',
        due_date: '',
        due_time: '',
        batch_id: '',
        use_predefined_topic: false,
        selected_topic_id: '',
        image_url: '',
        grammar_exercise_set_ids: []
      };
      setNewAssignment(resetForm);
      setSelectedDate(undefined);
      setImageFile(null);
      setImagePreview(null);
      setSelectedStudentIds([]);
      setStudentSearchTerm('');
      setExerciseSetSearchTerm('');
      setCreateOpen(false);
      fetchAssignments();
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      toast({ 
        title: 'Error creating assignment', 
        description: err.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (assignmentId: string | undefined) => {
    if (!assignmentId || typeof assignmentId !== 'string' || assignmentId.trim() === '') {
      console.error('Invalid assignment ID:', assignmentId);
      toast({ title: 'Error', description: 'Invalid assignment ID. Please refresh the page and try again.', variant: 'destructive' });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      // Check if it's a grammar assignment by looking at the assignments list
      const assignment = assignments.find(a => {
        if (typeof a === 'object' && 'isGroup' in a && a.isGroup) return false;
        if (typeof a === 'object' && 'id' in a) return a.id === assignmentId.trim();
        return false;
      });
      
      const isGrammarAssignment = assignment && 'exam_type' in assignment && assignment.exam_type === 'GRAMMAR';

      if (isGrammarAssignment) {
        // Delete from grammar_manual_assignments
        const { error } = await supabase
          .from('grammar_manual_assignments')
          .delete()
          .eq('id', assignmentId.trim());
        
        if (error) {
          console.error('Delete error:', error);
          throw error;
        }
      } else {
        // Delete from regular assignments table
        const { error } = await supabase
          .from('assignments')
          .delete()
          .eq('id', assignmentId.trim());

        if (error) {
          console.error('Delete error:', error);
          throw error;
        }
      }

      toast({ title: 'Assignment deleted', description: 'The assignment has been successfully deleted.' });
      fetchAssignments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleViewSubmissions = async (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setViewSubmissionsOpen(true);
    setLoadingSubmissions(true);
    
    try {
      // Check if this is a grammar assignment
      const assignment = assignments.find(a => {
        if (typeof a === 'object' && 'isGroup' in a && a.isGroup) return false;
        if (typeof a === 'object' && 'id' in a) return a.id === assignmentId;
        return false;
      });
      
      const isGrammarAssignment = assignment && 'exam_type' in assignment && assignment.exam_type === 'GRAMMAR';
      
      if (isGrammarAssignment) {
        // Handle grammar assignment submissions
        await loadGrammarSubmissions(assignmentId);
        setLoadingSubmissions(false);
        return;
      }
      
      // SIMPLE APPROACH: Fetch all submissions first, then enrich with member/essay data
      // This is the most reliable way to ensure we see all submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false, nullsFirst: true });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        toast({ 
          title: 'Error', 
          description: 'Failed to load submissions: ' + submissionsError.message,
          variant: 'destructive' 
        });
        setSubmissions([]);
        setLoadingSubmissions(false);
        return;
      }

      if (!submissionsData || submissionsData.length === 0) {
        setSubmissions([]);
        setLoadingSubmissions(false);
        return;
      }

      console.log('Fetched submissions:', submissionsData.length, submissionsData);
      // Log each submission's key fields for debugging
      submissionsData.forEach((sub, idx) => {
        console.log(`Submission ${idx + 1}:`, {
          id: sub.id,
          member_id: sub.member_id,
          essay_id: sub.essay_id,
          status: sub.status,
          submitted_at: sub.submitted_at,
          assignment_id: sub.assignment_id
        });
      });

      // Get all unique member IDs from submissions
      const memberIds = [...new Set(submissionsData.map(s => s.member_id).filter(Boolean))];
      
      if (memberIds.length === 0) {
        setSubmissions([]);
        setLoadingSubmissions(false);
        return;
      }

      // Fetch member details
      const { data: membersData, error: membersError } = await supabase
        .from('institution_members')
        .select('id, user_id')
        .in('id', memberIds);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }

      if (!membersData || membersData.length === 0) {
        setSubmissions([]);
        setLoadingSubmissions(false);
        return;
      }

      // Fetch profiles for the members
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Don't throw - we can still show submissions without profiles
      }

      // Fetch essays if they exist - CRITICAL for showing essay content
      const essayIds = submissionsData
        .map(s => s.essay_id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      console.log('Essay IDs to fetch:', essayIds);
      
      let essaysData: any[] = [];
      if (essayIds.length > 0) {
        const { data: essays, error: essaysError } = await supabase
          .from('essays')
          .select('id, essay_text, word_count')
          .in('id', essayIds);

        if (essaysError) {
          console.error('Error fetching essays:', essaysError);
          console.error('Essay fetch error details:', {
            message: essaysError.message,
            details: essaysError.details,
            hint: essaysError.hint,
            code: essaysError.code
          });
          // Don't throw - we can still show submissions without essay text
          // But log it so we can debug RLS issues
        } else {
          essaysData = essays || [];
          console.log(`Successfully fetched ${essaysData.length} out of ${essayIds.length} essays`);
          if (essaysData.length < essayIds.length) {
            const fetchedIds = new Set(essaysData.map(e => e.id));
            const missingIds = essayIds.filter(id => !fetchedIds.has(id));
            console.warn('Some essays could not be fetched (possibly RLS):', missingIds);
          }
        }
      } else {
        console.log('No essay IDs found in submissions');
      }

      // Create maps for easy lookup
      const memberMap = new Map(membersData.map(m => [m.id, m]));
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      const essayMap = new Map(essaysData.map(e => [e.id, e]));

      // Enrich submissions with member, profile, and essay data
      const enrichedSubmissions = submissionsData.map(submission => {
        const member = memberMap.get(submission.member_id);
        const profile = member ? profileMap.get(member.user_id) : null;
        const essay = submission.essay_id ? essayMap.get(submission.essay_id) : null;

        // CRITICAL: If essay_id exists, this is definitely submitted
        // Force status to 'submitted' if essay_id exists (unless already reviewed)
        let finalStatus = submission.status;
        if (submission.essay_id) {
          if (submission.status === 'reviewed') {
            finalStatus = 'reviewed';
          } else {
            // Force to submitted if essay_id exists
            finalStatus = 'submitted';
            // Also ensure submitted_at is set if missing
            if (!submission.submitted_at) {
              submission.submitted_at = submission.created_at || new Date().toISOString();
            }
          }
        }

        console.log('Enriching submission:', {
          id: submission.id,
          member_id: submission.member_id,
          essay_id: submission.essay_id,
          original_status: submission.status,
          final_status: finalStatus,
          has_essay_data: !!essay
        });

        return {
          ...submission,
          status: finalStatus,
          // Ensure essay_id is always included
          essay_id: submission.essay_id || null,
          member: member ? {
            user_id: member.user_id,
            profile: profile || null
          } : null,
          essay: essay || null
        };
      });

      // Sort: submitted first, then by submitted_at
      enrichedSubmissions.sort((a, b) => {
        if (a.submitted_at && !b.submitted_at) return -1;
        if (!a.submitted_at && b.submitted_at) return 1;
        if (a.submitted_at && b.submitted_at) {
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        }
        return 0;
      });

      console.log('Enriched submissions:', enrichedSubmissions);
      setSubmissions(enrichedSubmissions as Submission[]);
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to load submissions',
        variant: 'destructive' 
      });
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadGrammarSubmissions = async (assignmentId: string) => {
    try {
      // Fetch grammar assignment details
      const { data: grammarAssignment, error: assignmentError } = await supabase
        .from('grammar_manual_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      if (!grammarAssignment) {
        setSubmissions([]);
        return;
      }

      // Fetch all completions for this assignment
      const { data: completions, error: completionsError } = await supabase
        .from('grammar_exercise_completions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('assignment_type', 'manual')
        .order('completed_at', { ascending: false });

      if (completionsError) {
        console.error('Error fetching completions:', completionsError);
        // Don't throw - try to fetch from attempts instead
      }

      // If no completions, try to get from attempts (for backwards compatibility)
      if (!completions || completions.length === 0) {
        // Fetch attempts to see if students have submitted
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('grammar_attempts')
          .select('student_id, submitted_at')
          .eq('assignment_id', assignmentId)
          .eq('assignment_type', 'manual')
          .order('submitted_at', { ascending: false });

        if (attemptsError) {
          console.error('Error fetching attempts:', attemptsError);
        }

        if (!attemptsData || attemptsData.length === 0) {
          setSubmissions([]);
          return;
        }

        // Group attempts by student to create submission records
        const studentAttemptsMap = new Map<string, any>();
        attemptsData.forEach((attempt: any) => {
          if (!studentAttemptsMap.has(attempt.student_id)) {
            studentAttemptsMap.set(attempt.student_id, {
              student_id: attempt.student_id,
              submitted_at: attempt.submitted_at
            });
          } else {
            // Update to most recent submission
            const existing = studentAttemptsMap.get(attempt.student_id);
            if (new Date(attempt.submitted_at) > new Date(existing.submitted_at)) {
              existing.submitted_at = attempt.submitted_at;
            }
          }
        });

        // Get unique student IDs from attempts
        const studentIds = Array.from(studentAttemptsMap.keys());
        
        // Fetch student member records
        const { data: membersData, error: membersError } = await supabase
          .from('institution_members')
          .select('id, user_id, institution_id')
          .in('user_id', studentIds)
          .eq('institution_id', grammarAssignment.institute_id)
          .eq('status', 'active');

        if (membersError) throw membersError;

        // Fetch profiles
        const userIds = membersData?.map(m => m.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        // Fetch exercise set details
        const exerciseSetIds = grammarAssignment.exercise_set_ids || [];
        const { data: exerciseSets } = await supabase
          .from('grammar_exercise_sets')
          .select('id, title')
          .in('id', exerciseSetIds);

        // Fetch all attempts for detailed analysis
        const { data: attempts, error: attemptsError2 } = await supabase
          .from('grammar_attempts')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('assignment_type', 'manual')
          .order('submitted_at', { ascending: false });

        if (attemptsError2) {
          console.error('Error fetching attempts:', attemptsError2);
        }

        // Group completions by student
        const studentMap = new Map(membersData?.map(m => [m.user_id, m]) || []);
        const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
        const exerciseSetMap = new Map((exerciseSets || []).map(es => [es.id, es]));

        // Create submission objects grouped by student
        const studentSubmissionsMap = new Map<string, any>();

        studentAttemptsMap.forEach((attemptInfo, studentId) => {
          const member = studentMap.get(studentId);
          const profile = member ? profileMap.get(member.user_id) : null;
          
          studentSubmissionsMap.set(studentId, {
            id: `grammar-${studentId}-${assignmentId}`,
            member_id: member?.id || null,
            student_id: studentId,
            assignment_id: assignmentId,
            status: 'submitted',
            submitted_at: attemptInfo.submitted_at,
            member: member ? {
              user_id: member.user_id,
              profile: profile || null
            } : null,
            grammar_data: {
              completions: [],
              total_questions: 0,
              total_correct: 0,
              total_incorrect: 0,
              exercise_sets_completed: 0,
              overall_score: 0,
              overall_accuracy: 0
            }
          });
        });

        // Calculate overall scores and attach attempt details
        const attemptsByStudent = new Map<string, any[]>();
        (attempts || []).forEach(attempt => {
          if (!attemptsByStudent.has(attempt.student_id)) {
            attemptsByStudent.set(attempt.student_id, []);
          }
          attemptsByStudent.get(attempt.student_id)!.push(attempt);
        });

        const enrichedSubmissions = Array.from(studentSubmissionsMap.values()).map(submission => {
          const studentAttempts = attemptsByStudent.get(submission.student_id) || [];
          const exerciseSetAttempts = new Map<string, { correct: number; total: number; attempts: any[] }>();

          studentAttempts.forEach(attempt => {
            if (attempt.exercise_set_id) {
              if (!exerciseSetAttempts.has(attempt.exercise_set_id)) {
                exerciseSetAttempts.set(attempt.exercise_set_id, { correct: 0, total: 0, attempts: [] });
              }
              const stats = exerciseSetAttempts.get(attempt.exercise_set_id)!;
              stats.total++;
              if (attempt.is_correct) stats.correct++;
              stats.attempts.push(attempt);
            }
          });

          const totalQuestions = studentAttempts.length;
          const totalCorrect = studentAttempts.filter(a => a.is_correct).length;
          const totalIncorrect = totalQuestions - totalCorrect;
          
          submission.grammar_data.total_questions = totalQuestions;
          submission.grammar_data.total_correct = totalCorrect;
          submission.grammar_data.total_incorrect = totalIncorrect;
          submission.grammar_data.overall_score = totalCorrect;
          submission.grammar_data.overall_accuracy = totalQuestions > 0 
            ? Math.round((totalCorrect / totalQuestions) * 100) 
            : 0;
          submission.grammar_data.exercise_sets_completed = exerciseSetAttempts.size;
          submission.grammar_data.exercise_set_details = Array.from(exerciseSetAttempts.entries()).map(([setId, stats]) => ({
            exercise_set_id: setId,
            exercise_set_title: exerciseSetMap.get(setId)?.title || 'Unknown Exercise',
            correct: stats.correct,
            total: stats.total,
            accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
            attempts: stats.attempts
          }));

          return submission;
        });

        // Sort by completion date (most recent first)
        enrichedSubmissions.sort((a, b) => {
          if (!a.submitted_at) return 1;
          if (!b.submitted_at) return -1;
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        });

        setSubmissions(enrichedSubmissions as Submission[]);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(completions.map(c => c.student_id))];

      // Fetch student member records
      const { data: membersData, error: membersError } = await supabase
        .from('institution_members')
        .select('id, user_id, institution_id')
        .in('user_id', studentIds)
        .eq('institution_id', grammarAssignment.institute_id)
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Fetch exercise set details
      const exerciseSetIds = grammarAssignment.exercise_set_ids || [];
      const { data: exerciseSets } = await supabase
        .from('grammar_exercise_sets')
        .select('id, title')
        .in('id', exerciseSetIds);

      // Fetch all attempts for detailed analysis
      const { data: attempts, error: attemptsError } = await supabase
        .from('grammar_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('assignment_type', 'manual')
        .order('submitted_at', { ascending: false });

      if (attemptsError) {
        console.error('Error fetching attempts:', attemptsError);
      }

      // Group completions by student
      const studentMap = new Map(membersData?.map(m => [m.user_id, m]) || []);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      const exerciseSetMap = new Map((exerciseSets || []).map(es => [es.id, es]));

      // Create submission objects grouped by student
      const studentSubmissionsMap = new Map<string, any>();

      completions.forEach(completion => {
        const studentId = completion.student_id;
        if (!studentSubmissionsMap.has(studentId)) {
          const member = studentMap.get(studentId);
          const profile = member ? profileMap.get(member.user_id) : null;
          
          studentSubmissionsMap.set(studentId, {
            id: `grammar-${studentId}-${assignmentId}`,
            member_id: member?.id || null,
            student_id: studentId,
            assignment_id: assignmentId,
            status: 'submitted',
            submitted_at: completion.completed_at,
            member: member ? {
              user_id: member.user_id,
              profile: profile || null
            } : null,
            grammar_data: {
              completions: [],
              total_questions: 0,
              total_correct: 0,
              total_incorrect: 0,
              exercise_sets_completed: 0,
              overall_score: 0,
              overall_accuracy: 0
            }
          });
        }

        const submission = studentSubmissionsMap.get(studentId)!;
        submission.grammar_data.completions.push(completion);
        submission.grammar_data.total_questions += completion.total_questions;
        submission.grammar_data.total_correct += completion.correct_answers;
        submission.grammar_data.total_incorrect += completion.incorrect_answers;
        submission.grammar_data.exercise_sets_completed += 1;
      });

      // Calculate overall scores and attach attempt details
      const attemptsByStudent = new Map<string, any[]>();
      (attempts || []).forEach(attempt => {
        if (!attemptsByStudent.has(attempt.student_id)) {
          attemptsByStudent.set(attempt.student_id, []);
        }
        attemptsByStudent.get(attempt.student_id)!.push(attempt);
      });

      const enrichedSubmissions = Array.from(studentSubmissionsMap.values()).map(submission => {
        const studentAttempts = attemptsByStudent.get(submission.student_id) || [];
        const exerciseSetAttempts = new Map<string, { correct: number; total: number; attempts: any[] }>();

        // Recalculate from attempts (which includes overrides) instead of using stale completion data
        studentAttempts.forEach(attempt => {
          if (attempt.exercise_set_id) {
            if (!exerciseSetAttempts.has(attempt.exercise_set_id)) {
              exerciseSetAttempts.set(attempt.exercise_set_id, { correct: 0, total: 0, attempts: [] });
            }
            const stats = exerciseSetAttempts.get(attempt.exercise_set_id)!;
            stats.total++;
            if (attempt.is_correct) stats.correct++; // This will use the overridden value from database
            stats.attempts.push(attempt);
          }
        });

        // Recalculate totals from attempts (source of truth after overrides)
        const recalculatedTotalQuestions = studentAttempts.length;
        const recalculatedTotalCorrect = studentAttempts.filter(a => a.is_correct).length;
        const recalculatedTotalIncorrect = recalculatedTotalQuestions - recalculatedTotalCorrect;
        
        // Update submission with recalculated values from attempts
        submission.grammar_data.total_questions = recalculatedTotalQuestions;
        submission.grammar_data.total_correct = recalculatedTotalCorrect;
        submission.grammar_data.total_incorrect = recalculatedTotalIncorrect;
        submission.grammar_data.overall_score = recalculatedTotalCorrect;
        submission.grammar_data.overall_accuracy = recalculatedTotalQuestions > 0 
          ? Math.round((recalculatedTotalCorrect / recalculatedTotalQuestions) * 100) 
          : 0;
        submission.grammar_data.exercise_set_details = Array.from(exerciseSetAttempts.entries()).map(([setId, stats]) => ({
          exercise_set_id: setId,
          exercise_set_title: exerciseSetMap.get(setId)?.title || 'Unknown Exercise',
          correct: stats.correct,
          total: stats.total,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          attempts: stats.attempts
        }));
        
        // Store all attempts for detailed view
        submission.grammar_data.all_attempts = studentAttempts;

        return submission;
      });

      // Sort by completion date (most recent first)
      enrichedSubmissions.sort((a, b) => {
        if (!a.submitted_at) return 1;
        if (!b.submitted_at) return -1;
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });

      setSubmissions(enrichedSubmissions as Submission[]);
    } catch (err: any) {
      console.error('Error loading grammar submissions:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load grammar submissions',
        variant: 'destructive'
      });
      setSubmissions([]);
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const loadSubmissionDetails = async (submission: any) => {
    try {
      console.log('Loading submission details for:', submission);
      
      // Fetch all attempts with question details
      const { data: attempts, error: attemptsError } = await supabase
        .from('grammar_attempts')
        .select('*')
        .eq('assignment_id', submission.assignment_id)
        .eq('assignment_type', 'manual')
        .eq('student_id', submission.student_id)
        .order('submitted_at', { ascending: true });

      if (attemptsError) {
        console.error('Error fetching attempts:', attemptsError);
        toast({
          title: 'Error',
          description: 'Failed to load submission details',
          variant: 'destructive'
        });
        return;
      }

      if (!attempts || attempts.length === 0) {
        console.log('No attempts found for submission');
        setSelectedSubmissionDetails({
          ...submission,
          questions: []
        });
        return;
      }

      console.log('Found attempts:', attempts.length);
      console.log('Sample attempt:', attempts[0]);

      // Fetch all question details
      const questionIds = [...new Set(attempts.map(a => a.question_id).filter(Boolean))];
      const exerciseSetIds = [...new Set(attempts.map(a => a.exercise_set_id).filter(Boolean))];
      const exerciseIds = [...new Set(attempts.map(a => a.exercise_id).filter(Boolean))];

      console.log('Question IDs:', questionIds);
      console.log('Exercise Set IDs:', exerciseSetIds);
      console.log('Exercise IDs (fallback):', exerciseIds);

      const questionsMap = new Map();
      if (questionIds.length > 0) {
        const { data: questions, error: questionsError } = await supabase
          .from('grammar_questions')
          .select('id, question, answer, exercise_set_id')
          .in('id', questionIds);
        
        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
        } else {
          console.log('Fetched questions:', questions?.length);
          questions?.forEach(q => questionsMap.set(q.id, q));
        }
      }

      // Fallback: if question_id is not available, try using exercise_id
      if (questionsMap.size === 0 && exerciseIds.length > 0) {
        console.log('Trying fallback: fetching by exercise_id');
        const { data: questionsByExerciseId, error: fallbackError } = await supabase
          .from('grammar_questions')
          .select('id, question, answer, exercise_set_id')
          .in('id', exerciseIds);
        
        if (!fallbackError && questionsByExerciseId) {
          questionsByExerciseId.forEach(q => questionsMap.set(q.id, q));
          console.log('Fetched questions via fallback:', questionsByExerciseId.length);
        }
      }

      const exerciseSetsMap = new Map();
      if (exerciseSetIds.length > 0) {
        const { data: exerciseSets, error: exerciseSetsError } = await supabase
          .from('grammar_exercise_sets')
          .select('id, title')
          .in('id', exerciseSetIds);
        
        if (exerciseSetsError) {
          console.error('Error fetching exercise sets:', exerciseSetsError);
        } else {
          exerciseSets?.forEach(es => exerciseSetsMap.set(es.id, es));
        }
      }

      // Combine attempts with question details
      const questionsWithDetails = attempts.map((attempt: any) => {
        // Try to get question by question_id first, then by exercise_id
        let question = questionsMap.get(attempt.question_id);
        if (!question && attempt.exercise_id) {
          question = questionsMap.get(attempt.exercise_id);
        }
        
        const exerciseSet = exerciseSetsMap.get(attempt.exercise_set_id);
        
        console.log(`Attempt ${attempt.id}: question_id=${attempt.question_id}, exercise_id=${attempt.exercise_id}, found question:`, !!question);
        
        return {
          attempt_id: attempt.id,
          question_id: attempt.question_id || attempt.exercise_id,
          exercise_set_id: attempt.exercise_set_id,
          exercise_set_title: exerciseSet?.title || 'Unknown Exercise',
          question: question?.question || 'N/A',
          correct_answer: question?.answer || 'N/A',
          student_answer: attempt.user_answer,
          is_correct: attempt.is_correct,
          submitted_at: attempt.submitted_at,
          // Allow override
          override_correct: null as boolean | null
        };
      });

      console.log('Questions with details:', questionsWithDetails.length);
      console.log('Sample question detail:', questionsWithDetails[0]);

      setSelectedSubmissionDetails({
        ...submission,
        questions: questionsWithDetails
      });
      
      // Initialize override state - preserve existing overrides if reloading
      const overrideState: { [key: string]: boolean } = { ...scoreOverride };
      questionsWithDetails.forEach((q: any) => {
        // Only set if not already overridden
        if (overrideState[q.attempt_id] === undefined) {
          overrideState[q.attempt_id] = q.is_correct;
        }
      });
      setScoreOverride(overrideState);
    } catch (error: any) {
      console.error('Error loading submission details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load submission details',
        variant: 'destructive'
      });
    }
  };

  const handleScoreOverride = (attemptId: string, newCorrectStatus: boolean) => {
    // Find the question details
    const question = selectedSubmissionDetails?.questions?.find((q: any) => q.attempt_id === attemptId);
    if (!question) {
      toast({
        title: 'Error',
        description: 'Question not found',
        variant: 'destructive'
      });
      return;
    }

    // Check if we need to update accepted answers
    const wasIncorrect = !question.is_correct;
    const willBeCorrect = newCorrectStatus;
    const needsAnswerUpdate = (wasIncorrect && willBeCorrect) || (!wasIncorrect && !willBeCorrect);

    if (needsAnswerUpdate && question.question_id) {
      // Show dialog to ask about updating accepted answers
      setPendingOverride({ attemptId, newStatus: newCorrectStatus, question });
      setOverrideDialogOpen(true);
      setUpdateAnswerScope('skip');
    } else {
      // No answer update needed, proceed directly
      performScoreOverride(attemptId, newCorrectStatus, question, 'skip');
    }
  };

  const performScoreOverride = async (
    attemptId: string, 
    newCorrectStatus: boolean, 
    question: any,
    answerUpdateScope: 'global' | 'per-student' | 'skip'
  ) => {
    try {
      // Update the attempt in database
      const { data: updatedAttempt, error: attemptError } = await supabase
        .from('grammar_attempts')
        .update({ 
          is_correct: newCorrectStatus,
          score: newCorrectStatus ? 1.0 : 0.0
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (attemptError) {
        console.error('Error updating attempt in database:', attemptError);
        throw attemptError;
      }

      if (!updatedAttempt) {
        throw new Error('Failed to update attempt - no data returned');
      }

      console.log('Successfully updated attempt in database:', updatedAttempt);

      // Update accepted answers if requested
      if (answerUpdateScope !== 'skip' && question.question_id) {
        // Fetch current question
        const { data: currentQuestion, error: questionError } = await supabase
          .from('grammar_questions')
          .select('answer')
          .eq('id', question.question_id)
          .single();

        if (!questionError && currentQuestion) {
          const currentAnswers = currentQuestion.answer.split(/[|,]/).map((a: string) => a.trim()).filter(Boolean);
          const studentAnswer = question.student_answer.trim();
          
          if (newCorrectStatus) {
            // Adding student answer as accepted
            if (!currentAnswers.some((a: string) => a.toLowerCase() === studentAnswer.toLowerCase())) {
              const updatedAnswers = answerUpdateScope === 'global' 
                ? [...currentAnswers, studentAnswer].join('|')
                : currentQuestion.answer; // Per-student would need a different approach
              
              if (answerUpdateScope === 'global') {
                const { error: updateError } = await supabase
                  .from('grammar_questions')
                  .update({ answer: updatedAnswers })
                  .eq('id', question.question_id);
                
                if (updateError) {
                  console.error('Error updating question answer:', updateError);
                } else {
                  // Update local state
                  question.correct_answer = updatedAnswers;
                }
              }
            }
          } else {
            // Removing answer (if it was in the accepted list)
            if (currentAnswers.some((a: string) => a.toLowerCase() === studentAnswer.toLowerCase())) {
              const updatedAnswers = currentAnswers
                .filter((a: string) => a.toLowerCase() !== studentAnswer.toLowerCase())
                .join('|');
              
              if (answerUpdateScope === 'global') {
                const { error: updateError } = await supabase
                  .from('grammar_questions')
                  .update({ answer: updatedAnswers })
                  .eq('id', question.question_id);
                
                if (updateError) {
                  console.error('Error updating question answer:', updateError);
                } else {
                  // Update local state
                  question.correct_answer = updatedAnswers;
                }
              }
            }
          }
        }
      }

      // Update local state immediately for UI responsiveness
      const updatedOverride = { ...scoreOverride, [attemptId]: newCorrectStatus };
      setScoreOverride(updatedOverride);

      // Update the submission details
      if (selectedSubmissionDetails) {
        const updatedQuestions = selectedSubmissionDetails.questions.map((q: any) => {
          if (q.attempt_id === attemptId) {
            return { 
              ...q, 
              is_correct: newCorrectStatus,
              correct_answer: question.correct_answer || q.correct_answer
            };
          }
          return q;
        });
        const updatedSubmission = {
          ...selectedSubmissionDetails,
          questions: updatedQuestions,
          // Update grammar_data stats
          grammar_data: {
            ...selectedSubmissionDetails.grammar_data,
            total_correct: updatedQuestions.filter((q: any) => {
              const isCorrect = updatedOverride[q.attempt_id] !== undefined 
                ? updatedOverride[q.attempt_id] 
                : q.is_correct;
              return isCorrect;
            }).length,
            total_incorrect: updatedQuestions.filter((q: any) => {
              const isCorrect = updatedOverride[q.attempt_id] !== undefined 
                ? updatedOverride[q.attempt_id] 
                : q.is_correct;
              return !isCorrect;
            }).length,
            overall_score: updatedQuestions.filter((q: any) => {
              const isCorrect = updatedOverride[q.attempt_id] !== undefined 
                ? updatedOverride[q.attempt_id] 
                : q.is_correct;
              return isCorrect;
            }).length,
            overall_accuracy: updatedQuestions.length > 0
              ? Math.round((updatedQuestions.filter((q: any) => {
                  const isCorrect = updatedOverride[q.attempt_id] !== undefined 
                    ? updatedOverride[q.attempt_id] 
                    : q.is_correct;
                  return isCorrect;
                }).length / updatedQuestions.length) * 100)
              : 0
          }
        };
        setSelectedSubmissionDetails(updatedSubmission);

        // Recalculate and update completion records using updated override state
        await recalculateSubmissionScore(updatedSubmission, updatedOverride);
      }

      // Refresh the main submissions list to show updated scores
      if (selectedAssignmentId) {
        // Small delay to ensure database is updated
        setTimeout(async () => {
          await loadGrammarSubmissions(selectedAssignmentId);
        }, 500);
      }

      toast({
        title: 'Score Updated',
        description: answerUpdateScope === 'global' 
          ? 'Score and accepted answers updated globally.'
          : answerUpdateScope === 'per-student'
          ? 'Score updated. Answer change is per-student only.'
          : 'The score has been successfully overridden.',
      });
    } catch (error: any) {
      console.error('Error overriding score:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to override score',
        variant: 'destructive'
      });
    }
  };

  const recalculateSubmissionScore = async (submission: any, overrideState: { [key: string]: boolean }) => {
    try {
      // Recalculate completion records based on updated attempts
      const exerciseSetGroups = new Map<string, { correct: number; total: number }>();
      
      // Use the provided override state
      submission.questions.forEach((q: any) => {
        const isCorrect = overrideState[q.attempt_id] !== undefined 
          ? overrideState[q.attempt_id] 
          : q.is_correct;
        
        if (!exerciseSetGroups.has(q.exercise_set_id)) {
          exerciseSetGroups.set(q.exercise_set_id, { correct: 0, total: 0 });
        }
        const stats = exerciseSetGroups.get(q.exercise_set_id)!;
        stats.total++;
        if (isCorrect) stats.correct++;
      });

      // Update completion records to reflect overrides
      const updatePromises = Array.from(exerciseSetGroups.entries()).map(async ([exerciseSetId, stats]) => {
        const { data, error } = await supabase
          .from('grammar_exercise_completions')
          .update({
            total_questions: stats.total,
            correct_answers: stats.correct,
            incorrect_answers: stats.total - stats.correct,
            score: stats.correct,
            completed_at: new Date().toISOString() // Update timestamp
          })
          .eq('student_id', submission.student_id)
          .eq('assignment_id', submission.assignment_id)
          .eq('assignment_type', 'manual')
          .eq('exercise_set_id', exerciseSetId)
          .select();
        
        if (error) {
          console.error(`Error updating completion for exercise set ${exerciseSetId}:`, error);
        } else {
          console.log(`Updated completion for exercise set ${exerciseSetId}:`, data);
        }
        return { data, error };
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.warn('Some completion records failed to update:', errors);
      }

      // Refresh submissions list to update the main view (but don't reload details to preserve overrides)
      if (selectedAssignmentId) {
        await loadGrammarSubmissions(selectedAssignmentId);
        // DO NOT reload submission details here - it would reset the override state
        // The local state is already updated, so we just need to update the main list
      }
    } catch (error: any) {
      console.error('Error recalculating score:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Assignments
            </CardTitle>
            <CardDescription>Create and manage essay assignments for students</CardDescription>
          </div>
          <Dialog 
            open={createOpen} 
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                // Reset form when dialog closes
                setNewAssignment({
                  title: '',
                  topic: '',
                  exam_type: 'GRE',
                  task_type: '',
                  instructions: '',
                  due_date: '',
                  due_time: '',
                  batch_id: '',
                  use_predefined_topic: false,
                  selected_topic_id: '',
                  image_url: '',
                });
                setSelectedDate(undefined);
                setImageFile(null);
                setImagePreview(null);
                setSelectedStudentIds([]);
                setStudentSearchTerm('');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Assignment
                </DialogTitle>
                <DialogDescription>
                  Create an essay assignment with topic, timeline, and requirements for your students
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Assignment Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Weekly Practice Essay #1"
                        value={newAssignment.title}
                        onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exam_type">Exam Type *</Label>
                      <Select
                        value={newAssignment.exam_type}
                        onValueChange={(value) => setNewAssignment(prev => ({ ...prev, exam_type: value }))}
                      >
                        <SelectTrigger id="exam_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GRE">
                            <span className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" /> GRE/PT
                            </span>
                          </SelectItem>
                          <SelectItem value="IELTS_T1">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4" /> IELTS Task 1 (Academic)
                            </span>
                          </SelectItem>
                          <SelectItem value="IELTS_T1_General">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4" /> IELTS Task 1 (General)
                            </span>
                          </SelectItem>
                          <SelectItem value="IELTS_T2">
                            <span className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" /> IELTS Task 2
                            </span>
                          </SelectItem>
                          <SelectItem value="GRAMMAR">
                            <span className="flex items-center gap-2">
                              <CheckSquare className="h-4 w-4" /> Grammar Exercise
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Assign to Batch (optional)</Label>
                    <Select
                      value={newAssignment.batch_id || "all"}
                      onValueChange={(value) => {
                        setNewAssignment(prev => ({ ...prev, batch_id: value === "all" ? "" : value }));
                        // Clear student selection when batch is selected
                        if (value !== "all") {
                          setSelectedStudentIds([]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All students" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All students</SelectItem>
                        {batches.map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Or select specific students below (overrides batch selection)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Assign to Specific Students (optional)</Label>
                    <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search students..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {students
                          .filter(student => 
                            !studentSearchTerm || 
                            student.profile?.display_name?.toLowerCase().includes(studentSearchTerm.toLowerCase())
                          )
                          .map(student => (
                            <div key={student.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                              <Checkbox
                                id={`student-${student.id}`}
                                checked={selectedStudentIds.includes(student.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedStudentIds([...selectedStudentIds, student.id]);
                                    // Clear batch selection when specific students are selected
                                    setNewAssignment(prev => ({ ...prev, batch_id: '' }));
                                  } else {
                                    setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`student-${student.id}`}
                                className="flex items-center gap-2 flex-1 cursor-pointer"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={student.profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {student.profile?.display_name?.charAt(0) || 'S'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{student.profile?.display_name || 'Student'}</span>
                              </label>
                            </div>
                          ))}
                        {students.filter(student => 
                          !studentSearchTerm || 
                          student.profile?.display_name?.toLowerCase().includes(studentSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No students found
                          </p>
                        )}
                      </div>
                      {selectedStudentIds.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground">
                            {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Topic & Details Section */}
                    <div className="space-y-4 pt-4 border-t">
                      {/* Grammar Exercise Set Selection */}
                      {newAssignment.exam_type === 'GRAMMAR' && (
                        <div className="space-y-2">
                          <Label>Select Grammar Exercise Sets *</Label>
                          
                          {/* Search Bar */}
                          {availableGrammarExerciseSets.length > 0 && (
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search exercise sets..."
                                value={exerciseSetSearchTerm}
                                onChange={(e) => setExerciseSetSearchTerm(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                          )}
                          
                          <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                            {availableGrammarExerciseSets.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No grammar exercise sets available. Create some first!
                              </p>
                            ) : (() => {
                              // Filter exercise sets based on search term
                              const filteredSets = availableGrammarExerciseSets.filter((exerciseSet) => {
                                if (!exerciseSetSearchTerm.trim()) return true;
                                const searchLower = exerciseSetSearchTerm.toLowerCase();
                                const topicName = ((exerciseSet.grammar_topics as any)?.topic_name || 'General').toLowerCase();
                                return (
                                  exerciseSet.title.toLowerCase().includes(searchLower) ||
                                  topicName.includes(searchLower) ||
                                  exerciseSet.description?.toLowerCase().includes(searchLower)
                                );
                              });

                              if (filteredSets.length === 0) {
                                return (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No exercise sets match your search.
                                  </p>
                                );
                              }

                              return (
                                <div className="space-y-2">
                                  {filteredSets.map((exerciseSet) => {
                                    const topicName = (exerciseSet.grammar_topics as any)?.topic_name || 'General';
                                    return (
                                      <div
                                        key={exerciseSet.id}
                                        className="flex items-start gap-2 p-2 border rounded hover:bg-muted/50 cursor-pointer"
                                        onClick={() => {
                                          const isSelected = newAssignment.grammar_exercise_set_ids.includes(exerciseSet.id);
                                          setNewAssignment(prev => ({
                                            ...prev,
                                            grammar_exercise_set_ids: isSelected
                                              ? prev.grammar_exercise_set_ids.filter(id => id !== exerciseSet.id)
                                              : [...prev.grammar_exercise_set_ids, exerciseSet.id]
                                          }));
                                        }}
                                      >
                                        <Checkbox
                                          checked={newAssignment.grammar_exercise_set_ids.includes(exerciseSet.id)}
                                          onCheckedChange={(checked) => {
                                            setNewAssignment(prev => ({
                                              ...prev,
                                              grammar_exercise_set_ids: checked
                                                ? [...prev.grammar_exercise_set_ids, exerciseSet.id]
                                                : prev.grammar_exercise_set_ids.filter(id => id !== exerciseSet.id)
                                            }));
                                          }}
                                        />
                                        <div className="flex-1">
                                          <div className="font-medium">{exerciseSet.title}</div>
                                          <div className="text-sm text-muted-foreground">
                                            Topic: {topicName} • Difficulty: {exerciseSet.difficulty === 1 ? 'Easy' : exerciseSet.difficulty === 2 ? 'Medium' : 'Hard'}
                                          </div>
                                          {exerciseSet.description && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {exerciseSet.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                          {newAssignment.grammar_exercise_set_ids.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {newAssignment.grammar_exercise_set_ids.length} exercise set{newAssignment.grammar_exercise_set_ids.length !== 1 ? 's' : ''} selected
                            </p>
                          )}
                        </div>
                      )}

                      {newAssignment.exam_type !== 'IELTS_T1_General' && newAssignment.exam_type !== 'GRAMMAR' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="use_predefined"
                          checked={newAssignment.use_predefined_topic}
                          onChange={(e) => setNewAssignment(prev => ({ 
                            ...prev, 
                            use_predefined_topic: e.target.checked,
                            selected_topic_id: e.target.checked ? prev.selected_topic_id : ''
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="use_predefined" className="cursor-pointer">
                          Use predefined topic from library
                        </Label>
                      </div>
                      )}

                      {newAssignment.use_predefined_topic && availableTopics.length > 0 && (
                        <div className="space-y-2">
                          <Label>Select Topic</Label>
                          <Select
                            value={newAssignment.selected_topic_id}
                            onValueChange={(value) => setNewAssignment(prev => ({ ...prev, selected_topic_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a topic..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {availableTopics.map((topic) => {
                                let id = '';
                                let display = '';
                                if (newAssignment.exam_type === 'GRE') {
                                  const t = topic as GRETopic;
                                  id = t.id.toString();
                                  display = `${t.type === 'issue' ? 'Issue' : 'Argument'} #${t.id}: ${t.topic.substring(0, 60)}...`;
                                } else if (newAssignment.exam_type === 'IELTS_T1') {
                                  const t = topic as IELTSTask1Question;
                                  id = t.id;
                                  display = `${t.title} (${t.type})`;
                                } else {
                                  const t = topic as IELTSTask2Topic;
                                  id = t.id;
                                  display = `${t.type}: ${t.topic.substring(0, 60)}...`;
                                }
                                return (
                                  <SelectItem key={id} value={id}>
                                    {display}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {newAssignment.exam_type !== 'GRAMMAR' && (
                      <div className="space-y-2">
                        <Label htmlFor="topic">
                          Essay Topic/Prompt * 
                          {newAssignment.use_predefined_topic && newAssignment.selected_topic_id && (
                            <span className="text-xs text-muted-foreground ml-2">(Pre-filled from selection)</span>
                          )}
                        </Label>
                        <Textarea
                          id="topic"
                          placeholder="Enter the essay topic or prompt..."
                          value={newAssignment.topic}
                          onChange={(e) => setNewAssignment(prev => ({ ...prev, topic: e.target.value }))}
                          rows={4}
                          className="font-serif"
                        />
                      </div>
                      )}

                      {newAssignment.exam_type === 'IELTS_T1' && (
                        <div className="space-y-2">
                          <Label>Task 1 Type (optional)</Label>
                          <Select
                            value={newAssignment.task_type}
                            onValueChange={(value) => setNewAssignment(prev => ({ ...prev, task_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bar-chart">Bar Chart</SelectItem>
                              <SelectItem value="line-graph">Line Graph</SelectItem>
                              <SelectItem value="pie-chart">Pie Chart</SelectItem>
                              <SelectItem value="table">Table</SelectItem>
                              <SelectItem value="map">Map</SelectItem>
                              <SelectItem value="process">Process Diagram</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {newAssignment.exam_type === 'IELTS_T1_General' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            General Task 1 is for letter writing, notes, and other written responses. No image upload needed.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="instructions">Instructions</Label>
                        <Textarea
                          id="instructions"
                          placeholder="Additional instructions for students (e.g., word count requirements, formatting guidelines)..."
                          value={newAssignment.instructions}
                          onChange={(e) => setNewAssignment(prev => ({ ...prev, instructions: e.target.value }))}
                          rows={3}
                        />
                        {newAssignment.use_predefined_topic && newAssignment.selected_topic_id && (
                          <p className="text-xs text-muted-foreground">
                            Instructions are pre-filled from the selected topic. You can modify them.
                          </p>
                        )}
                      </div>

                      {/* Image Upload Section - Hidden for General Task 1 and Grammar */}
                      {newAssignment.exam_type !== 'IELTS_T1_General' && newAssignment.exam_type !== 'GRAMMAR' && (
                      <div className="space-y-2">
                        <Label htmlFor="assignment_image">
                          Assignment Image (optional)
                          <span className="text-xs text-muted-foreground ml-2">
                            Useful for IELTS Task 1 (Academic) charts/graphs or visual prompts
                          </span>
                        </Label>
                        {!imagePreview ? (
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              <div className="text-center">
                                <Label htmlFor="image-upload" className="cursor-pointer text-primary hover:underline">
                                  Click to upload an image
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  PNG, JPG, JPEG up to 5MB
                                </p>
                              </div>
                              <Input
                                id="image-upload"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={handleImageSelect}
                                className="hidden"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="relative border rounded-lg p-4">
                            <img
                              src={imagePreview}
                              alt="Assignment preview"
                              className="max-h-64 w-full object-contain rounded"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={removeImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            {uploadingImage && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      )}

                    </div>

                  {/* Timeline & Settings Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Due Date & Time (optional)</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, 'PPP') : 'Select due date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={newAssignment.due_time}
                          onChange={(e) => setNewAssignment(prev => ({ ...prev, due_time: e.target.value }))}
                          placeholder="Time (optional)"
                        />
                      </div>
                      {newAssignment.due_date && (() => {
                        try {
                          const dueDateTime = new Date(`${newAssignment.due_date}T${newAssignment.due_time || '23:59'}`);
                          if (isNaN(dueDateTime.getTime())) {
                            return null;
                          }
                          return (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                Due: {format(dueDateTime, 'PPP p')}
                                {' '}
                                ({formatDistanceToNow(dueDateTime, { addSuffix: true })})
                              </span>
                            </div>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-primary" />
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">Assignment Summary</p>
                          <div className="space-y-1 text-muted-foreground">
                            <p><strong>Title:</strong> {newAssignment.title || 'Not set'}</p>
                            <p><strong>Type:</strong> {
                              newAssignment.exam_type === 'GRE' ? 'GRE/PT' :
                              newAssignment.exam_type === 'IELTS_T1' ? 'IELTS Task 1' :
                              newAssignment.exam_type === 'IELTS_T1_General' ? 'IELTS Task 1 (General)' :
                              newAssignment.exam_type === 'IELTS_T2' ? 'IELTS Task 2' :
                              newAssignment.exam_type === 'GRAMMAR' ? 'Grammar Exercise' :
                              'Unknown'
                            }</p>
                            {newAssignment.exam_type === 'GRAMMAR' && newAssignment.grammar_exercise_set_ids.length > 0 && (
                              <p><strong>Exercise Sets:</strong> {newAssignment.grammar_exercise_set_ids.length} selected</p>
                            )}
                            <p><strong>Batch:</strong> {
                              newAssignment.batch_id 
                                ? batches.find(b => b.id === newAssignment.batch_id)?.name || 'Selected'
                                : 'All students'
                            }</p>
                            {newAssignment.due_date && (() => {
                              try {
                                const dueDateTime = new Date(`${newAssignment.due_date}T${newAssignment.due_time || '23:59'}`);
                                if (isNaN(dueDateTime.getTime())) {
                                  return <p><strong>Deadline:</strong> Invalid date</p>;
                                }
                                return (
                                  <p><strong>Deadline:</strong> {format(dueDateTime, 'PPP p')}</p>
                                );
                              } catch (e) {
                                return <p><strong>Deadline:</strong> Invalid date</p>;
                              }
                            })()}
                            <p><strong>Image:</strong> {imagePreview || newAssignment.image_url ? (
                              <span className="text-green-600">✓ Attached</span>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>

              <DialogFooter className="mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCreateOpen(false);
                    setNewAssignment({
                      title: '',
                      topic: '',
                      exam_type: 'GRE',
                      task_type: '',
                      instructions: '',
                      due_date: '',
                      due_time: '',
                      batch_id: '',
                      use_predefined_topic: false,
                      selected_topic_id: '',
                      image_url: '',
                      grammar_exercise_set_ids: []
                    });
                    setSelectedDate(undefined);
                    setImageFile(null);
                    setImagePreview(null);
                    setExerciseSetSearchTerm('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createAssignment} 
                  disabled={
                    saving || 
                    !newAssignment.title.trim() || 
                    (newAssignment.exam_type === 'GRAMMAR' 
                      ? newAssignment.grammar_exercise_set_ids.length === 0
                      : !newAssignment.topic.trim())
                  }
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Assignment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No assignments yet</p>
            <p className="text-sm">Create your first assignment for students</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((item, index) => {
                // Handle grouped assignments
                if ('isGroup' in item && item.isGroup) {
                  const groupAssignments = item.assignments;
                  const groupName = item.assignments[0]?.group?.name || 'Grouped Assignment';
                  const totalSubmissions = groupAssignments.reduce((sum, a) => sum + (a.submissionCount || 0), 0);
                  const firstAssignment = groupAssignments[0];
                  
                  return (
                    <React.Fragment key={item.groupId || `group-${index}`}>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {groupName} ({groupAssignments.length} tasks)
                            <Badge variant="secondary" className="ml-2">
                              {totalSubmissions} total submissions
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {groupAssignments
                        .filter(assignment => assignment && assignment.id && assignment.title)
                        .map((assignment) => (
                        <TableRow key={assignment.id} className="bg-muted/10">
                          <TableCell>
                            <div className="pl-6">
                              <div className="font-medium flex items-center gap-2">
                                {assignment.title || 'Untitled Assignment'}
                                {assignment.image_url && (
                                  <Badge variant="outline" className="text-xs">
                                    <ImageIcon className="h-3 w-3 mr-1" />
                                    Image
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {assignment.topic || 'No topic'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {assignment.exam_type === 'GRE' && (
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" /> GRE/PT
                                </span>
                              )}
                              {assignment.exam_type === 'IELTS_T1' && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> IELTS T1
                                </span>
                              )}
                              {assignment.exam_type === 'IELTS_T2' && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" /> IELTS T2
                                </span>
                              )}
                              {assignment.exam_type === 'IELTS_T1_General' && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> IELTS T1 (General)
                                </span>
                              )}
                              {assignment.exam_type === 'GRAMMAR' && (
                                <span className="flex items-center gap-1">
                                  <CheckSquare className="h-3 w-3" /> Grammar
                                </span>
                              )}
                              {!['GRE', 'IELTS_T1', 'IELTS_T1_General', 'IELTS_T2', 'GRAMMAR'].includes(assignment.exam_type) && assignment.exam_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {assignment.batch?.name || (
                              <span className="text-muted-foreground">All students</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {assignment.due_date ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className={isOverdue(assignment.due_date) ? 'text-destructive font-medium' : ''}>
                                    {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                                  </span>
                                  {isOverdue(assignment.due_date) && (
                                    <Badge variant="destructive" className="text-xs">Overdue</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(assignment.due_date), 'h:mm a')}
                                </span>
                                {!isOverdue(assignment.due_date) && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No deadline</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{format(new Date(assignment.created_at), 'MMM d, yyyy')}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(assignment.created_at), 'h:mm a')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <FileText className="h-3 w-3 mr-1" />
                              {assignment.submissionCount || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewSubmissions(assignment.id, item.groupId)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Submissions
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteAssignment(assignment.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                }
                
                // Handle ungrouped assignment
                const assignment = item as Assignment;
                
                // Skip invalid assignments
                if (!assignment || !assignment.id || !assignment.title) {
                  return null;
                }
                
                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {assignment.title || 'Untitled Assignment'}
                          {assignment.image_url && (
                            <Badge variant="outline" className="text-xs">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              Image
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {assignment.topic || 'No topic'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {assignment.exam_type === 'GRE' && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" /> GRE/PT
                          </span>
                        )}
                        {assignment.exam_type === 'IELTS_T1' && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" /> IELTS T1
                          </span>
                        )}
                        {assignment.exam_type === 'IELTS_T2' && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> IELTS T2
                          </span>
                        )}
                        {!['GRE', 'IELTS_T1', 'IELTS_T2'].includes(assignment.exam_type) && assignment.exam_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.batch?.name || (
                        <span className="text-muted-foreground">All students</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {assignment.due_date ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className={isOverdue(assignment.due_date) ? 'text-destructive font-medium' : ''}>
                              {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                            </span>
                            {isOverdue(assignment.due_date) && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(assignment.due_date), 'h:mm a')}
                          </span>
                          {!isOverdue(assignment.due_date) && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(assignment.due_date), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No deadline</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{format(new Date(assignment.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(assignment.created_at), 'h:mm a')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <FileText className="h-3 w-3 mr-1" />
                        {assignment.submissionCount || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewSubmissions(assignment.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Submissions
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            if (assignment?.id) {
                              deleteAssignment(assignment.id);
                            } else {
                              toast({ title: 'Error', description: 'Assignment ID is missing', variant: 'destructive' });
                            }
                          }}
                          className="text-destructive hover:text-destructive"
                          disabled={!assignment?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* View Submissions Dialog */}
      <Dialog open={viewSubmissionsOpen} onOpenChange={setViewSubmissionsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Assignment Submissions
            </DialogTitle>
            <DialogDescription>
              View and manage student submissions for this assignment
            </DialogDescription>
          </DialogHeader>
          
          {loadingSubmissions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No submissions yet</p>
              <p className="text-sm">Students haven't submitted this assignment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Check if this is a grammar assignment by checking first submission
                const isGrammar = submissions.length > 0 && 'grammar_data' in submissions[0];
                
                if (isGrammar) {
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Exercise Sets</TableHead>
                          <TableHead>Questions</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Accuracy</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((submission: any) => (
                          <TableRow key={submission.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={submission.member?.profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {submission.member?.profile?.display_name?.charAt(0) || 'S'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {submission.member?.profile?.display_name || 'Student'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-blue-500">
                                Completed
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {submission.submitted_at ? (
                                <span className="text-sm">
                                  {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {submission.grammar_data?.exercise_sets_completed || 0} / {submission.grammar_data?.exercise_set_details?.length || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {submission.grammar_data?.total_correct || 0} / {submission.grammar_data?.total_questions || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {submission.grammar_data?.overall_score || 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm font-medium ${
                                (submission.grammar_data?.overall_accuracy || 0) >= 70 ? 'text-green-600' :
                                (submission.grammar_data?.overall_accuracy || 0) >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {submission.grammar_data?.overall_accuracy || 0}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={async () => {
                                  // Load all question details for this submission
                                  await loadSubmissionDetails(submission);
                                  setDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                }
                
                // Regular essay assignment view
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Word Count</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={submission.member?.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {submission.member?.profile?.display_name?.charAt(0) || 'S'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {submission.member?.profile?.display_name || 'Student'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              // CRITICAL: Determine actual status - prioritize essay_id over stored status
                              // If essay_id exists, it MUST be submitted (unless reviewed)
                              const hasEssayId = !!submission.essay_id;
                              const storedStatus = submission.status || 'pending';
                              const isReviewed = storedStatus === 'reviewed';
                              
                              // If essay_id exists, it's definitely submitted (unless reviewed)
                              const isSubmitted = hasEssayId || storedStatus === 'submitted';
                              
                              let statusText = 'Not Started';
                              let variant: 'default' | 'outline' | 'secondary' = 'secondary';
                              let className = '';
                              
                              if (isReviewed) {
                                statusText = 'Reviewed';
                                variant = 'default';
                                className = 'bg-green-500';
                              } else if (isSubmitted) {
                                statusText = 'Submitted';
                                variant = 'default';
                                className = 'bg-blue-500';
                              } else if (storedStatus === 'in_progress') {
                                statusText = 'In Progress';
                                variant = 'outline';
                              } else if (storedStatus === 'not_started') {
                                statusText = 'Not Started';
                                variant = 'secondary';
                              } else {
                                statusText = 'Pending';
                                variant = 'secondary';
                              }
                              
                              // Debug log if status seems wrong
                              if (hasEssayId && !isSubmitted && !isReviewed) {
                                console.warn('Status mismatch detected:', {
                                  submission_id: submission.id,
                                  essay_id: submission.essay_id,
                                  stored_status: storedStatus,
                                  displayed_status: statusText
                                });
                              }
                              
                              return (
                                <Badge variant={variant} className={className}>
                                  {statusText}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              // If essay_id exists, it's definitely submitted
                              const hasEssayId = !!submission.essay_id;
                              const hasSubmittedAt = !!submission.submitted_at;
                              
                              if (hasSubmittedAt) {
                                return (
                                  <span className="text-sm">
                                    {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                                  </span>
                                );
                              } else if (hasEssayId) {
                                // Has essay but no timestamp - still submitted
                                return (
                                  <span className="text-sm text-muted-foreground">Submitted</span>
                                );
                              } else {
                                return (
                                  <span className="text-muted-foreground text-sm">Not submitted</span>
                                );
                              }
                            })()}
                          </TableCell>
                          <TableCell>
                            {submission.essay?.word_count ? (
                              <span className="text-sm">{submission.essay.word_count} words</span>
                            ) : submission.essay_id ? (
                              <span className="text-sm text-muted-foreground">Loading...</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.teacher_score ? (
                              <Badge variant="secondary">{submission.teacher_score}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                // CRITICAL: Check essay_id first - if it exists, navigate to essay
                                if (submission.essay_id) {
                                  console.log('Navigating to essay:', submission.essay_id);
                                  // Navigate to review assignment essay page - it handles RLS properly
                                  navigate(`/institution/review-essay/${submission.essay_id}`);
                                } else {
                                  // No essay_id - check if status suggests it should exist
                                  const hasEssayId = !!submission.essay_id;
                                  const isSubmitted = hasEssayId || submission.status === 'submitted' || submission.status === 'reviewed';
                                  
                                  if (isSubmitted && !hasEssayId) {
                                    // Status says submitted but no essay_id - data issue
                                    toast({ 
                                      title: 'Essay not found', 
                                      description: 'The submission is marked as submitted but the essay link is missing. The essay may still be processing. Please refresh the page.',
                                      variant: 'destructive' 
                                    });
                                  } else {
                                    toast({ 
                                      title: 'No essay', 
                                      description: 'Student has not submitted an essay yet.',
                                      variant: 'destructive' 
                                    });
                                  }
                                }
                              }}
                              disabled={!submission.essay_id}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Essay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
            </div>
          )              }
            </DialogContent>
          </Dialog>

          {/* Grammar Submission Details Dialog */}
          <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Grammar Assignment Submission Details</DialogTitle>
                <DialogDescription>
                  Review all questions and answers. You can override scores if there was a scoring error.
                </DialogDescription>
              </DialogHeader>
              
              {selectedSubmissionDetails && (
                <div className="space-y-6 mt-4">
                  {/* Overview Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Total Questions</div>
                          <div className="text-2xl font-bold">{selectedSubmissionDetails.grammar_data?.total_questions || 0}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Correct</div>
                          <div className="text-2xl font-bold text-green-600">
                            {selectedSubmissionDetails.questions?.filter((q: any) => {
                              const isCorrect = scoreOverride[q.attempt_id] !== undefined 
                                ? scoreOverride[q.attempt_id] 
                                : q.is_correct;
                              return isCorrect;
                            }).length || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Incorrect</div>
                          <div className="text-2xl font-bold text-red-600">
                            {selectedSubmissionDetails.questions?.filter((q: any) => {
                              const isCorrect = scoreOverride[q.attempt_id] !== undefined 
                                ? scoreOverride[q.attempt_id] 
                                : q.is_correct;
                              return !isCorrect;
                            }).length || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Accuracy</div>
                          <div className="text-2xl font-bold">
                            {selectedSubmissionDetails.questions && selectedSubmissionDetails.questions.length > 0
                              ? Math.round((selectedSubmissionDetails.questions.filter((q: any) => {
                                  const isCorrect = scoreOverride[q.attempt_id] !== undefined 
                                    ? scoreOverride[q.attempt_id] 
                                    : q.is_correct;
                                  return isCorrect;
                                }).length / selectedSubmissionDetails.questions.length) * 100)
                              : 0}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Exercise Set Breakdown */}
                      {selectedSubmissionDetails.grammar_data?.exercise_set_details && (
                        <div className="mt-4 space-y-2">
                          <div className="text-sm font-medium">Exercise Sets:</div>
                          {selectedSubmissionDetails.grammar_data.exercise_set_details.map((es: any) => {
                            const questionsInSet = selectedSubmissionDetails.questions?.filter((q: any) => q.exercise_set_id === es.exercise_set_id) || [];
                            const correctInSet = questionsInSet.filter((q: any) => {
                              const isCorrect = scoreOverride[q.attempt_id] !== undefined 
                                ? scoreOverride[q.attempt_id] 
                                : q.is_correct;
                              return isCorrect;
                            }).length;
                            
                            return (
                              <div key={es.exercise_set_id} className="text-sm">
                                <span className="font-medium">{es.exercise_set_title}:</span>{' '}
                                <span className={correctInSet / questionsInSet.length >= 0.7 ? 'text-green-600' : correctInSet / questionsInSet.length >= 0.5 ? 'text-yellow-600' : 'text-red-600'}>
                                  {correctInSet}/{questionsInSet.length} correct ({Math.round((correctInSet / questionsInSet.length) * 100)}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Questions List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">All Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedSubmissionDetails.questions?.map((q: any, idx: number) => {
                          const isCorrect = scoreOverride[q.attempt_id] !== undefined 
                            ? scoreOverride[q.attempt_id] 
                            : q.is_correct;
                          
                          return (
                            <div 
                              key={q.attempt_id} 
                              className={`p-4 border rounded-lg ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {q.exercise_set_title}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">Question {idx + 1}</span>
                                  </div>
                                  <div className="font-medium mb-2">{q.question}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isCorrect ? (
                                    <Badge className="bg-green-500">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Correct
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Incorrect
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Student Answer:</div>
                                  <div className="p-2 bg-background border rounded text-sm">{q.student_answer}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Correct Answer:</div>
                                  <div className="p-2 bg-background border rounded text-sm">{q.correct_answer}</div>
                                </div>
                              </div>
                              
                              <div className="mt-3 flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleScoreOverride(q.attempt_id, !isCorrect)}
                                >
                                  {isCorrect ? 'Mark as Incorrect' : 'Mark as Correct'}
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  Submitted: {new Date(q.submitted_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Override Confirmation Dialog - Outside the map loop */}
          {pendingOverride && (
            <AlertDialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {pendingOverride.newStatus ? 'Mark as Correct' : 'Mark as Incorrect'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <div>
                      <p className="font-medium mb-1">Student Answer:</p>
                      <p className="text-sm bg-muted p-2 rounded">{pendingOverride.question.student_answer}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Current Accepted Answers:</p>
                      <p className="text-sm bg-muted p-2 rounded">{pendingOverride.question.correct_answer}</p>
                    </div>
                    {pendingOverride.newStatus ? (
                      <p>
                        Would you like to add the student's answer as an accepted answer for this question?
                      </p>
                    ) : (
                      <p>
                        Would you like to remove this answer from the accepted answers list?
                      </p>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-3 py-4">
                  <div className="space-y-2">
                    <Label>Update Accepted Answers:</Label>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant={updateAnswerScope === 'global' ? 'default' : 'outline'}
                        className="w-full justify-start h-auto py-3"
                        onClick={() => setUpdateAnswerScope('global')}
                      >
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium">Global - Update for all students</span>
                          <span className="text-xs text-muted-foreground mt-1">This will update the question for all future students</span>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={updateAnswerScope === 'per-student' ? 'default' : 'outline'}
                        className="w-full justify-start h-auto py-3"
                        onClick={() => setUpdateAnswerScope('per-student')}
                      >
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium">Per-Student - Only for this student</span>
                          <span className="text-xs text-muted-foreground mt-1">This will only affect this student's scoring</span>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={updateAnswerScope === 'skip' ? 'default' : 'outline'}
                        className="w-full justify-start h-auto py-3"
                        onClick={() => setUpdateAnswerScope('skip')}
                      >
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium">Skip - Don't update answers</span>
                          <span className="text-xs text-muted-foreground mt-1">Only the score will be updated, not the accepted answers</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {
                    setOverrideDialogOpen(false);
                    setPendingOverride(null);
                    setUpdateAnswerScope('skip');
                  }}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (pendingOverride) {
                        await performScoreOverride(
                          pendingOverride.attemptId,
                          pendingOverride.newStatus,
                          pendingOverride.question,
                          updateAnswerScope
                        );
                        setOverrideDialogOpen(false);
                        setPendingOverride(null);
                        setUpdateAnswerScope('skip');
                      }
                    }}
                  >
                    Confirm Override
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
    </Card>
  );
}
