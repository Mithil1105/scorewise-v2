import React, { useState, useEffect } from 'react';
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
  BookOpen, GraduationCap, Sparkles, Info, Image as ImageIcon, X, Search, Check, CheckCircle2, Pencil
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

interface AssignmentManagerProps {
  initialDialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

export function AssignmentManager(props: AssignmentManagerProps = {}) {
  const { initialDialogOpen = false, onDialogOpenChange } = props;
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(initialDialogOpen);
  const [saving, setSaving] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [viewSubmissionsOpen, setViewSubmissionsOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    topic: '',
    instructions: '',
    originalTopic: '',
    originalInstructions: ''
  });

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
    image_url: ''
  });
  
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; assignments: Assignment[] }>>([]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableTopics, setAvailableTopics] = useState<GRETopic[] | IELTSTask1Question[] | IELTSTask2Topic[]>([]);
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

  // Sync with parent component's dialog state
  useEffect(() => {
    if (initialDialogOpen !== undefined) {
      setCreateOpen(initialDialogOpen);
    }
  }, [initialDialogOpen]);

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
    } else if (newAssignment.exam_type === 'IELTS_T1') {
      setAvailableTopics(ieltsTask1Questions);
    } else if (newAssignment.exam_type === 'IELTS_T2') {
      setAvailableTopics(ieltsTask2Topics);
    } else {
      setAvailableTopics([]);
    }
    
    // Reset topic selection when exam type changes
    setNewAssignment(prev => ({
      ...prev,
      selected_topic_id: '',
      topic: '',
      instructions: '',
      task_type: ''
    }));
  }, [newAssignment.exam_type]);

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
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          batch:batches(name)
        `)
        .eq('institution_id', activeInstitution.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch submission counts
      const assignmentIds = data?.map(a => a.id) || [];
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id')
        .in('assignment_id', assignmentIds);

      const countMap = new Map<string, number>();
      submissions?.forEach(s => {
        countMap.set(s.assignment_id, (countMap.get(s.assignment_id) || 0) + 1);
      });

      // Filter out invalid assignments and enrich with submission counts
      const enrichedAssignments = (data || [])
        .filter(a => a && a.id && a.title && a.topic) // Only include valid assignments
        .map(a => ({
          ...a,
          submissionCount: countMap.get(a.id) || 0
        }));

      // Sort by creation date
      enrichedAssignments.sort((a, b) => {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate;
      });

      setAssignments(enrichedAssignments);
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
    
    // Validate assignment fields
      if (!newAssignment.title.trim()) {
        toast({ title: 'Error', description: 'Please enter an assignment title', variant: 'destructive' });
        return;
      }
      
      if (!newAssignment.topic.trim()) {
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

      // Create single assignment
      // Create assignment first (we need the ID for image path)
      // Ensure batch_id is properly handled
      const batchIdValue = newAssignment.batch_id && newAssignment.batch_id.trim() && newAssignment.batch_id !== 'all' 
        ? newAssignment.batch_id.trim() 
        : null;

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
        image_url: ''
      };
      setNewAssignment(resetForm);
      setSelectedDate(undefined);
      setImageFile(null);
      setImagePreview(null);
      setSelectedStudentIds([]);
      setStudentSearchTerm('');
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

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      title: assignment.title,
      topic: assignment.topic,
      instructions: assignment.instructions || '',
      originalTopic: assignment.topic,
      originalInstructions: assignment.instructions || ''
    });
    setEditOpen(true);
  };

  const saveEditedAssignment = async () => {
    if (!editingAssignment || !user) return;

    setSaving(true);
    try {
      // Check if original values are already stored (first edit vs subsequent edits)
      const updateData: any = {
        title: editForm.title.trim(),
        topic: editForm.topic.trim(),
        instructions: editForm.instructions.trim() || null,
        updated_at: new Date().toISOString()
      };

      // Store original values if this is the first edit (they don't exist yet)
      // We'll check by querying the current assignment first
      const { data: currentAssignment } = await supabase
        .from('assignments')
        .select('original_topic, original_instructions')
        .eq('id', editingAssignment.id)
        .single();

      // If original values don't exist, store current values as originals
      if (!currentAssignment?.original_topic && !currentAssignment?.original_instructions) {
        updateData.original_topic = editForm.originalTopic;
        updateData.original_instructions = editForm.originalInstructions || null;
      }

      const { error } = await supabase
        .from('assignments')
        .update(updateData)
        .eq('id', editingAssignment.id);

      if (error) throw error;

      toast({ 
        title: 'Assignment updated!', 
        description: 'Changes have been saved. Students will see the updated assignment with change indicators.' 
      });
      
      setEditOpen(false);
      setEditingAssignment(null);
      fetchAssignments();
      setSaving(false);
    } catch (err: any) {
      console.error('Error updating assignment:', err);
      toast({ title: 'Error', description: err.message || 'Failed to update assignment', variant: 'destructive' });
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
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId.trim());

      if (error) {
        console.error('Delete error:', error);
        throw error;
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
      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false, nullsFirst: true });

      if (submissionsError) throw submissionsError;

      if (!submissionsData || submissionsData.length === 0) {
        setSubmissions([]);
        return;
      }

      // Fetch member details
      const memberIds = submissionsData.map(s => s.member_id);
      const { data: membersData, error: membersError } = await supabase
        .from('institution_members')
        .select('id, user_id')
        .in('id', memberIds);

      if (membersError) throw membersError;

      // Fetch profiles for the members
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Fetch essays if they exist
      const essayIds = submissionsData
        .map(s => s.essay_id)
        .filter((id): id is string => id !== null);
      
      let essaysData: any[] = [];
      if (essayIds.length > 0) {
        const { data: essays, error: essaysError } = await supabase
          .from('essays')
          .select('id, essay_text, word_count')
          .in('id', essayIds);

        if (essaysError) {
          console.error('Error fetching essays:', essaysError);
        } else {
          essaysData = essays || [];
        }
      }

      // Create maps for easy lookup
      const memberMap = new Map(membersData?.map(m => [m.id, m]) || []);
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const essayMap = new Map(essaysData.map(e => [e.id, e]));

      // Enrich submissions with member and profile data
      const enrichedSubmissions = submissionsData.map(submission => {
        const member = memberMap.get(submission.member_id);
        const profile = member ? profileMap.get(member.user_id) : null;
        const essay = submission.essay_id ? essayMap.get(submission.essay_id) : null;

        return {
          ...submission,
          member: member ? {
            user_id: member.user_id,
            profile: profile || null
          } : null,
          essay: essay || null
        };
      });

      setSubmissions(enrichedSubmissions as Submission[]);
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      toast({ 
        title: 'Error', 
        description: err.message || 'Failed to load submissions',
        variant: 'destructive' 
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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
              onDialogOpenChange?.(open);
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
                  image_url: ''
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
                              <FileText className="h-4 w-4" /> IELTS Task 1
                            </span>
                          </SelectItem>
                          <SelectItem value="IELTS_T2">
                            <span className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" /> IELTS Task 2
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

                      {/* Image Upload Section */}
                      <div className="space-y-2">
                        <Label htmlFor="assignment_image">
                          Assignment Image (optional)
                          <span className="text-xs text-muted-foreground ml-2">
                            Useful for IELTS Task 1 charts/graphs or visual prompts
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
                              'IELTS Task 2'
                            }</p>
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
                      image_url: ''
                    });
                    setSelectedDate(undefined);
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createAssignment} 
                  disabled={
                    saving || 
                    !newAssignment.title.trim() || 
                    !newAssignment.topic.trim()
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
                <TableHead>Submissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                
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
                          onClick={() => handleEditAssignment(assignment)}
                          title="Edit Assignment"
                        >
                          <Pencil className="h-4 w-4" />
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
                        <Badge 
                          variant={
                            submission.status === 'submitted' ? 'default' :
                            submission.status === 'reviewed' ? 'default' :
                            submission.status === 'in_progress' ? 'outline' :
                            'secondary'
                          }
                          className={
                            submission.status === 'reviewed' ? 'bg-green-500' : ''
                          }
                        >
                          {submission.status === 'submitted' ? 'Submitted' :
                           submission.status === 'reviewed' ? 'Reviewed' :
                           submission.status === 'in_progress' ? 'In Progress' :
                           'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {submission.submitted_at ? (
                          <span className="text-sm">
                            {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.essay?.word_count ? (
                          <span className="text-sm">{submission.essay.word_count} words</span>
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
                            if (submission.essay?.id) {
                              // Navigate to assignment essay review page
                              window.open(`/institution/review-essay/${submission.essay.id}`, '_blank');
                            } else {
                              toast({ 
                                title: 'No essay', 
                                description: 'Student has not submitted an essay yet.',
                                variant: 'destructive' 
                              });
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Essay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
          </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the assignment details. Changes will be highlighted for students.
            </DialogDescription>
          </DialogHeader>
          
          {editingAssignment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Assignment title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-topic">Topic</Label>
                <Textarea
                  id="edit-topic"
                  value={editForm.topic}
                  onChange={(e) => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="Essay topic or prompt"
                  rows={4}
                  className="font-mono"
                />
                {editForm.topic !== editForm.originalTopic && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    <strong>Original:</strong> {editForm.originalTopic}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-instructions">Instructions</Label>
                <Textarea
                  id="edit-instructions"
                  value={editForm.instructions}
                  onChange={(e) => setEditForm(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Additional instructions for students"
                  rows={3}
                />
                {editForm.instructions !== editForm.originalInstructions && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    <strong>Original:</strong> {editForm.originalInstructions || '(none)'}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedAssignment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
