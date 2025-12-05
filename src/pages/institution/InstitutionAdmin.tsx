import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, Copy, Users, UserCheck, UserX, 
  Loader2, Shield, GraduationCap, BookOpen, Clock, Paintbrush, FolderOpen,
  Award, FileText, TrendingUp, Star, Eye, Search, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstitutionBranding } from '@/components/institution/InstitutionBranding';
import { BatchManager } from '@/components/institution/BatchManager';

interface Member {
  id: string;
  user_id: string;
  role: 'student' | 'teacher' | 'inst_admin';
  status: 'active' | 'pending' | 'blocked';
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

export default function InstitutionAdmin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeMembership, activeInstitution, refreshMemberships, loading: institutionLoading } = useInstitution();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Recent Marks state
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [gradesSearchTerm, setGradesSearchTerm] = useState('');
  
  // All Essays state
  const [allEssays, setAllEssays] = useState<any[]>([]);
  const [loadingEssays, setLoadingEssays] = useState(false);
  const [essaysSearchTerm, setEssaysSearchTerm] = useState('');
  const [essaysStudentFilter, setEssaysStudentFilter] = useState<string>('all');
  
  // All Assignments state
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsSearchTerm, setAssignmentsSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewSubmissionsOpen, setViewSubmissionsOpen] = useState(false);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<string | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (activeInstitution && activeMembership?.role === 'inst_admin') {
        fetchMembers();
        fetchRecentGrades();
        fetchAllEssays();
        fetchAllAssignments();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, activeInstitution, activeMembership]);

  useEffect(() => {
    // Wait for both loading states to complete before checking access
    if (authLoading || institutionLoading) {
      return; // Still loading, don't check yet
    }

    // Only redirect if we're sure about the state
    if (!user) {
      navigate('/auth');
      return;
    }

    // Wait for institution context to fully load and restore from localStorage
    // The context should have restored by now, but give it a moment
    if (!activeMembership) {
      // Check if we have any memberships at all - if yes, wait a bit more
      // If no memberships exist, redirect immediately
      const timeout = setTimeout(() => {
        // Double-check after timeout - context might have restored
        if (!activeMembership) {
          navigate('/access-denied');
        }
      }, 500); // Reduced to 500ms - should be enough for localStorage restore
      return () => clearTimeout(timeout);
    }

    // Only redirect to access denied if we've confirmed the user doesn't have access
    if (user && (!activeMembership || activeMembership.role !== 'inst_admin' || activeMembership.status !== 'active')) {
      navigate('/access-denied');
      return;
    }

    // If we have valid access, fetch members
    if (activeMembership && activeMembership.role === 'inst_admin' && activeMembership.status === 'active') {
      fetchMembers();
      fetchRecentGrades();
      fetchAllEssays();
      fetchAllAssignments();
    }
  }, [user, activeMembership, authLoading, institutionLoading, navigate, activeInstitution]);

  // Refetch data when tab changes to ensure fresh data
  useEffect(() => {
    if (activeInstitution && activeMembership?.role === 'inst_admin' && activeMembership.status === 'active') {
      if (activeTab === 'grades') {
        fetchRecentGrades();
      } else if (activeTab === 'essays') {
        fetchAllEssays();
      } else if (activeTab === 'assignments') {
        fetchAllAssignments();
      } else if (activeTab === 'members') {
        fetchMembers();
      }
    }
  }, [activeTab, activeInstitution, activeMembership]);

  const fetchMembers = async () => {
    if (!activeInstitution) return;
    
    setLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('institution_members')
        .select('*')
        .eq('institution_id', activeInstitution.id);

      if (error) throw error;

      // Fetch profiles for members
      const userIds = membersData?.map(m => m.user_id) || [];
      let profiles = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          profiles = profilesData || [];
        }
      }

      // Fetch user emails using RPC function
      const emailMap = new Map<string, string>();
      if (userIds.length > 0) {
        try {
          const { data: userEmails, error: emailError } = await supabase
            .rpc('get_user_emails_by_ids', { user_ids: userIds });
          
          if (!emailError && userEmails) {
            userEmails.forEach((ue: { user_id: string; email: string }) => {
              if (ue.email) {
                emailMap.set(ue.user_id, ue.email);
              }
            });
          }
        } catch (err) {
          console.log('Could not fetch emails:', err);
        }
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      
      const enrichedMembers = (membersData || []).map(m => ({
        ...m,
        profile: profileMap.get(m.user_id),
        email: emailMap.get(m.user_id)
      })) as Member[];

      setMembers(enrichedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (activeInstitution?.code) {
      navigator.clipboard.writeText(activeInstitution.code);
      toast({ title: 'Code copied!', description: activeInstitution.code });
    }
  };

  const updateMemberStatus = async (memberId: string, status: 'active' | 'blocked') => {
    try {
      const { error } = await supabase
        .from('institution_members')
        .update({ status })
        .eq('id', memberId);

      if (error) throw error;
      
      toast({ title: status === 'active' ? 'Member approved!' : 'Member blocked' });
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateMemberRole = async (memberId: string, role: 'student' | 'teacher' | 'inst_admin') => {
    const member = members.find(m => m.id === memberId);
    
    // Prevent removing the last inst_admin
    if (member?.role === 'inst_admin' && role !== 'inst_admin') {
      const adminCount = members.filter(m => m.role === 'inst_admin' && m.status === 'active').length;
      if (adminCount <= 1) {
        toast({ title: 'Error', description: 'Cannot remove the last admin', variant: 'destructive' });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('institution_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
      
      toast({ title: 'Role updated!' });
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const fetchRecentGrades = async () => {
    if (!activeInstitution) return;

    setLoadingGrades(true);
    try {
      // First, get assignment IDs for this institution
      const { data: institutionAssignments } = await supabase
        .from("assignments")
        .select("id")
        .eq("institution_id", activeInstitution.id);

      const assignmentIds = institutionAssignments?.map(a => a.id) || [];

      if (assignmentIds.length === 0) {
        setRecentGrades([]);
        setLoadingGrades(false);
        return;
      }

      // Fetch all reviewed submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("assignment_submissions")
        .select(`
          id,
          assignment_id,
          essay_id,
          status,
          submitted_at,
          teacher_feedback,
          teacher_score,
          reviewed_at,
          member_id
        `)
        .eq("status", "reviewed")
        .not("teacher_score", "is", null)
        .in("assignment_id", assignmentIds)
        .order("reviewed_at", { ascending: false })
        .limit(50); // Limit to most recent 50

      if (submissionsError) throw submissionsError;

      if (!submissionsData || submissionsData.length === 0) {
        setRecentGrades([]);
        setLoadingGrades(false);
        return;
      }

      // Fetch related data separately
      const memberIds = [...new Set(submissionsData.map(s => s.member_id))];
      const assignmentIdsFromSubmissions = [...new Set(submissionsData.map(s => s.assignment_id))];

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("id, title, exam_type")
        .in("id", assignmentIdsFromSubmissions);

      // Fetch members
      const { data: membersData } = await supabase
        .from("institution_members")
        .select("id, user_id")
        .in("id", memberIds);

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      // Create maps for quick lookup
      const assignmentMap = new Map(assignmentsData?.map(a => [a.id, a]) || []);
      const memberMap = new Map(membersData?.map(m => [m.id, m]) || []);
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Combine data
      const enrichedSubmissions = submissionsData.map(submission => {
        const assignment = assignmentMap.get(submission.assignment_id);
        const member = memberMap.get(submission.member_id);
        const profile = member ? profileMap.get(member.user_id) : null;

        return {
          ...submission,
          assignment: assignment || { id: submission.assignment_id, title: 'Unknown', exam_type: 'Unknown' },
          member: member ? {
            ...member,
            profile: profile || null
          } : null
        };
      });

      setRecentGrades(enrichedSubmissions);
    } catch (err: any) {
      console.error('Error fetching recent grades:', err);
      toast({ title: 'Error', description: 'Failed to load recent grades', variant: 'destructive' });
    } finally {
      setLoadingGrades(false);
    }
  };

  const fetchAllEssays = async () => {
    if (!activeInstitution) return;

    setLoadingEssays(true);
    try {
      // Get all members in the institution
      const { data: membersData } = await supabase
        .from("institution_members")
        .select("id, user_id")
        .eq("institution_id", activeInstitution.id);

      const memberIds = membersData?.map(m => m.id) || [];
      const userIds = membersData?.map(m => m.user_id) || [];

      if (memberIds.length === 0) {
        setAllEssays([]);
        setLoadingEssays(false);
        return;
      }

      // Fetch ALL essays from the institution (both via institution_id and institution_member_id)
      // This includes essays that may not be linked to assignment_submissions
      // Fetch essays by institution_id
      const { data: essaysByInstitution } = await supabase
        .from("essays")
        .select("id, essay_text, exam_type, topic, word_count, created_at, ai_score, teacher_score, institution_id, institution_member_id, user_id")
        .eq("institution_id", activeInstitution.id)
        .order("created_at", { ascending: false });

      // Fetch essays by institution_member_id
      const { data: essaysByMember } = memberIds.length > 0 ? await supabase
        .from("essays")
        .select("id, essay_text, exam_type, topic, word_count, created_at, ai_score, teacher_score, institution_id, institution_member_id, user_id")
        .in("institution_member_id", memberIds)
        .order("created_at", { ascending: false }) : { data: null };

      // Combine and deduplicate essays
      const allEssaysMap = new Map();
      (essaysByInstitution || []).forEach(essay => {
        allEssaysMap.set(essay.id, essay);
      });
      (essaysByMember || []).forEach(essay => {
        allEssaysMap.set(essay.id, essay);
      });

      const essaysData = Array.from(allEssaysMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (essaysData.length === 0) {
        setAllEssays([]);
        setLoadingEssays(false);
        return;
      }

      // Get all submissions for these members (for linking)
      const { data: submissionsData } = await supabase
        .from("assignment_submissions")
        .select("id, essay_id, member_id, submitted_at, status")
        .in("member_id", memberIds);

      // Fetch members and profiles
      const essayUserIds = [...new Set(essaysData.map(e => e.user_id).filter(Boolean))];
      const { data: membersWithProfiles } = await supabase
        .from("institution_members")
        .select("id, user_id")
        .in("user_id", essayUserIds)
        .eq("institution_id", activeInstitution.id);

      const profileUserIds = membersWithProfiles?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", profileUserIds);

      // Create maps
      const submissionMap = new Map(submissionsData?.map(s => [s.essay_id, s]) || []);
      const memberMap = new Map(membersWithProfiles?.map(m => [m.user_id, m]) || []);
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Combine data
      const enrichedEssays = (essaysData || []).map(essay => {
        const submission = submissionMap.get(essay.id);
        // Try to find member by user_id first, then by institution_member_id
        const member = memberMap.get(essay.user_id) || 
                      (essay.institution_member_id ? membersWithProfiles?.find(m => m.id === essay.institution_member_id) : null);
        const profile = member ? profileMap.get(member.user_id) : null;

        return {
          ...essay,
          submission: submission || null,
          member: member ? {
            ...member,
            profile: profile || null
          } : null
        };
      });

      setAllEssays(enrichedEssays);
    } catch (err: any) {
      console.error('Error fetching all essays:', err);
      toast({ title: 'Error', description: 'Failed to load essays', variant: 'destructive' });
    } finally {
      setLoadingEssays(false);
    }
  };

  const fetchAllAssignments = async () => {
    if (!activeInstitution) return;

    setLoadingAssignments(true);
    try {
      // Fetch regular assignments
      const { data: assignmentsData, error } = await supabase
        .from("assignments")
        .select("id, title, topic, instructions, exam_type, due_date, created_at, is_active")
        .eq("institution_id", activeInstitution.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch grammar assignments
      const { data: grammarAssignments, error: grammarError } = await supabase
        .from("grammar_manual_assignments")
        .select("id, title, due_date, created_at")
        .eq("institute_id", activeInstitution.id)
        .order("created_at", { ascending: false });

      if (grammarError) {
        console.error('Error fetching grammar assignments:', grammarError);
      }

      // Convert grammar assignments to match regular assignment format
      const convertedGrammarAssignments = (grammarAssignments || []).map(ga => ({
        id: ga.id,
        title: ga.title,
        topic: 'Grammar Exercise',
        instructions: null,
        exam_type: 'GRAMMAR',
        due_date: ga.due_date,
        created_at: ga.created_at,
        is_active: true,
        isGrammar: true
      }));

      // Combine assignments
      const allAssignmentsCombined = [...(assignmentsData || []), ...convertedGrammarAssignments];

      // Fetch submission stats for regular assignments
      const regularAssignmentIds = (assignmentsData || []).map(a => a.id);
      const statsMap = new Map<string, { total: number; submitted: number; reviewed: number }>();
      
      if (regularAssignmentIds.length > 0) {
        const { data: submissionsData } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, status")
          .in("assignment_id", regularAssignmentIds);

        submissionsData?.forEach(s => {
          const current = statsMap.get(s.assignment_id) || { total: 0, submitted: 0, reviewed: 0 };
          current.total += 1;
          if (s.status === 'submitted' || s.status === 'reviewed') {
            current.submitted += 1;
          }
          if (s.status === 'reviewed') {
            current.reviewed += 1;
          }
          statsMap.set(s.assignment_id, current);
        });
      }

      // Fetch submission stats for grammar assignments
      const grammarAssignmentIds = (grammarAssignments || []).map(ga => ga.id);
      if (grammarAssignmentIds.length > 0) {
        const { data: grammarAttempts } = await supabase
          .from("grammar_attempts")
          .select("assignment_id, student_id")
          .eq("assignment_type", "manual")
          .in("assignment_id", grammarAssignmentIds);

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
          statsMap.set(assignmentId, { total: students.size, submitted: students.size, reviewed: 0 });
        });
      }

      const enrichedAssignments = allAssignmentsCombined.map(assignment => ({
        ...assignment,
        submissionStats: statsMap.get(assignment.id) || { total: 0, submitted: 0, reviewed: 0 }
      }));

      setAllAssignments(enrichedAssignments);
    } catch (err: any) {
      console.error('Error fetching all assignments:', err);
      toast({ title: 'Error', description: 'Failed to load assignments', variant: 'destructive' });
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleViewSubmissions = async (assignmentId: string, isGrammar: boolean = false) => {
    setSelectedAssignmentForSubmissions(assignmentId);
    setViewSubmissionsOpen(true);
    setLoadingSubmissions(true);
    
    try {
      if (isGrammar) {
        // Handle grammar assignment submissions
        const { data: attemptsData } = await supabase
          .from("grammar_attempts")
          .select("student_id, assignment_id")
          .eq("assignment_type", "manual")
          .eq("assignment_id", assignmentId);

        const uniqueStudents = new Set(attemptsData?.map(a => a.student_id) || []);
        
        // Fetch student details
        const { data: membersData } = await supabase
          .from("institution_members")
          .select("id, user_id")
          .eq("institution_id", activeInstitution!.id)
          .in("user_id", Array.from(uniqueStudents));

        const userIds = membersData?.map(m => m.user_id) || [];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        const memberMap = new Map(membersData?.map(m => [m.user_id, m]) || []);

        const submissions = Array.from(uniqueStudents).map(userId => {
          const member = memberMap.get(userId);
          const profile = profileMap.get(userId);
          return {
            id: userId,
            student_id: userId,
            member: member ? { ...member, profile } : null,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          };
        });

        setAssignmentSubmissions(submissions);
      } else {
        // Handle regular assignment submissions
        const { data: submissionsData, error } = await supabase
          .from("assignment_submissions")
          .select("id, member_id, status, submitted_at, essay_id, teacher_score, teacher_feedback")
          .eq("assignment_id", assignmentId)
          .order("submitted_at", { ascending: false });

        if (error) throw error;

        if (!submissionsData || submissionsData.length === 0) {
          setAssignmentSubmissions([]);
          setLoadingSubmissions(false);
          return;
        }

        // Fetch member and profile data
        const memberIds = [...new Set(submissionsData.map(s => s.member_id))];
        const { data: membersData } = await supabase
          .from("institution_members")
          .select("id, user_id")
          .in("id", memberIds);

        const userIds = membersData?.map(m => m.user_id) || [];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const memberMap = new Map(membersData?.map(m => [m.id, m]) || []);
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

        const enrichedSubmissions = submissionsData.map(submission => {
          const member = memberMap.get(submission.member_id);
          const profile = member ? profileMap.get(member.user_id) : null;
          return {
            ...submission,
            member: member ? { ...member, profile } : null
          };
        });

        setAssignmentSubmissions(enrichedSubmissions);
      }
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      toast({ title: 'Error', description: 'Failed to load submissions', variant: 'destructive' });
      setAssignmentSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Filter members - if search is empty and we're on members tab, show all
  // Otherwise filter by search term
  const filteredMembers = members.filter(m => {
    if (!searchTerm) return true; // Show all if no search
    return (
      m.profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Filter recent grades based on search term
  const filteredGrades = recentGrades.filter(grade => {
    if (!gradesSearchTerm) return true;
    const search = gradesSearchTerm.toLowerCase();
    const studentName = grade.member?.profile?.display_name?.toLowerCase() || '';
    const assignmentTitle = grade.assignment?.title?.toLowerCase() || '';
    return studentName.includes(search) || assignmentTitle.includes(search);
  });

  // Filter all essays based on search term and student filter
  const filteredEssays = allEssays.filter(essay => {
    // Filter by student
    if (essaysStudentFilter !== 'all') {
      const member = essay.member;
      if (!member || member.user_id !== essaysStudentFilter) {
        return false;
      }
    }
    
    // Filter by search term
    if (!essaysSearchTerm) return true;
    const search = essaysSearchTerm.toLowerCase();
    const studentName = essay.member?.profile?.display_name?.toLowerCase() || '';
    const topic = essay.topic?.toLowerCase() || '';
    return studentName.includes(search) || topic.includes(search);
  });

  // Filter all assignments based on search term
  const filteredAssignments = allAssignments.filter(assignment => {
    if (!assignmentsSearchTerm) return true;
    const search = assignmentsSearchTerm.toLowerCase();
    const title = assignment.title?.toLowerCase() || '';
    const topic = assignment.topic?.toLowerCase() || '';
    return title.includes(search) || topic.includes(search);
  });

  const getMaxScore = (examType: string): number => {
    if (examType === 'GRE' || examType === 'IELTS-Task2' || examType === 'IELTS_T2') return 6;
    if (examType === 'IELTS-Task1' || examType === 'IELTS_T1') return 3;
    return 10; // Default or other types
  };

  const pendingCount = members.filter(m => m.status === 'pending').length;
  const activeCount = members.filter(m => m.status === 'active').length;

  // Show loading state while checking permissions
  if (authLoading || institutionLoading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Don't render anything if we're redirecting (prevents flash of content)
  if (!user || !activeInstitution || !activeMembership || activeMembership.role !== 'inst_admin' || activeMembership.status !== 'active') {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Redirecting...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{activeInstitution.name}</h1>
            <p className="text-muted-foreground">Institution Admin Panel</p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Institution Code</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono font-bold">{activeInstitution.code}</code>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => {
              setActiveTab('members');
              setSearchTerm(''); // Clear search to show all active members
            }}
          >
            <CardHeader className="pb-2">
              <CardDescription>Active Members</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{activeCount}</span>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer hover:bg-muted/50 transition-colors ${pendingCount > 0 ? 'ring-2 ring-amber-500/50' : ''}`}
            onClick={() => {
              setActiveTab('members');
              // Filter to show only pending members
              const pendingMembers = members.filter(m => m.status === 'pending');
              if (pendingMembers.length > 0) {
                // Set search to find pending members (we'll filter in the table)
                setSearchTerm(''); // Clear search first
                // Scroll to first pending member
                setTimeout(() => {
                  const firstPending = document.querySelector('[data-pending-member="true"]');
                  firstPending?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
              }
            }}
          >
            <CardHeader className="pb-2">
              <CardDescription>Pending Requests</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  New
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Plan</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="capitalize">
                {activeInstitution.plan}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 max-w-5xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2 relative">
              <Users className="h-4 w-4" /> Members
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <Award className="h-4 w-4" /> Recent Marks
            </TabsTrigger>
            <TabsTrigger value="essays" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> All Essays
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Assignments
            </TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" /> Batches
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4" /> Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members
                </CardTitle>
                <CardDescription>Manage students, teachers, and admins</CardDescription>
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm mt-2"
                />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow 
                          key={member.id}
                          data-pending-member={member.status === 'pending' ? 'true' : undefined}
                          className={`${member.status === 'pending' ? 'bg-amber-50 dark:bg-amber-950/20' : ''} ${member.role === 'student' ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                          onClick={() => {
                            if (member.role === 'student' && member.status === 'active') {
                              navigate(`/institution/student-profile/${member.id}`);
                            }
                          }}
                        >
                          <TableCell>
                            <div className="font-medium">
                              {member.profile?.display_name || 'Unknown User'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={member.role}
                              onValueChange={(value) => updateMemberRole(member.id, value as any)}
                              disabled={member.user_id === user?.id}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">
                                  <span className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" /> Student
                                  </span>
                                </SelectItem>
                                <SelectItem value="teacher">
                                  <span className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Teacher
                                  </span>
                                </SelectItem>
                                <SelectItem value="inst_admin">
                                  <span className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Admin
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                member.status === 'active' ? 'default' :
                                member.status === 'pending' ? 'secondary' : 'destructive'
                              }
                            >
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(member.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {member.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateMemberStatus(member.id, 'active')}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateMemberStatus(member.id, 'blocked')}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {member.status === 'active' && member.user_id !== user?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateMemberStatus(member.id, 'blocked')}
                              >
                                Block
                              </Button>
                            )}
                            {member.status === 'blocked' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateMemberStatus(member.id, 'active')}
                              >
                                Unblock
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Institution Overview
                  </CardTitle>
                  <CardDescription>Quick statistics and information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setActiveTab('members')}
                  >
                    <span className="text-sm text-muted-foreground">Total Members</span>
                    <span className="text-2xl font-bold">{members.length}</span>
                  </div>
                  <div 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setActiveTab('members');
                      setSearchTerm(''); // Show all students
                    }}
                  >
                    <span className="text-sm text-muted-foreground">Active Students</span>
                    <span className="text-2xl font-bold">
                      {members.filter(m => m.role === 'student' && m.status === 'active').length}
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setActiveTab('members');
                      setSearchTerm(''); // Show all teachers
                    }}
                  >
                    <span className="text-sm text-muted-foreground">Teachers</span>
                    <span className="text-2xl font-bold">
                      {members.filter(m => m.role === 'teacher' && m.status === 'active').length}
                    </span>
                  </div>
                  <div 
                    className={`flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors ${pendingCount > 0 ? 'ring-2 ring-amber-500/30' : ''}`}
                    onClick={() => {
                      setActiveTab('members');
                      // Filter to show only pending members
                      setSearchTerm(''); // Clear search first
                      setTimeout(() => {
                        const firstPending = document.querySelector('[data-pending-member="true"]');
                        firstPending?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 100);
                    }}
                  >
                    <span className="text-sm text-muted-foreground">Pending Approvals</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-amber-500">{pendingCount}</span>
                      {pendingCount > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                          Action Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start hover:bg-primary/5 hover:border-primary transition-colors" 
                    onClick={() => setActiveTab('members')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                    {pendingCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {pendingCount} pending
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start hover:bg-primary/5 hover:border-primary transition-colors" 
                    onClick={() => setActiveTab('grades')}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    View Recent Grades
                    {filteredGrades.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {filteredGrades.length}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start hover:bg-primary/5 hover:border-primary transition-colors" 
                    onClick={() => setActiveTab('essays')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View All Essays
                    {filteredEssays.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {filteredEssays.length}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start hover:bg-primary/5 hover:border-primary transition-colors" 
                    onClick={() => setActiveTab('assignments')}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Assignments
                    {filteredAssignments.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {filteredAssignments.length}
                      </Badge>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recent Marks
                </CardTitle>
                <CardDescription>Latest graded assignments from all students</CardDescription>
                <Input
                  placeholder="Search by student or assignment..."
                  value={gradesSearchTerm}
                  onChange={(e) => setGradesSearchTerm(e.target.value)}
                  className="max-w-sm mt-2"
                />
              </CardHeader>
              <CardContent>
                {loadingGrades ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredGrades.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No graded assignments yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGrades.map((grade) => {
                        const maxScore = getMaxScore(grade.assignment.exam_type);
                        const scoreColor = grade.teacher_score !== null
                          ? (grade.teacher_score / maxScore >= 0.8 ? "text-green-600" :
                             grade.teacher_score / maxScore >= 0.6 ? "text-yellow-600" : "text-red-600")
                          : "";
                        return (
                          <TableRow key={grade.id}>
                            <TableCell>
                              <div className="font-medium">
                                {grade.member?.profile?.display_name || 'Unknown Student'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{grade.assignment.title}</div>
                              {grade.teacher_feedback && (
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {grade.teacher_feedback.substring(0, 50)}...
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{grade.assignment.exam_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {grade.teacher_score !== null ? (
                                <div className="flex items-center gap-2">
                                  <Star className={`h-4 w-4 ${scoreColor} fill-current`} />
                                  <span className={`font-semibold ${scoreColor}`}>
                                    {grade.teacher_score} / {maxScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {grade.reviewed_at ? format(new Date(grade.reviewed_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              {grade.essay_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/institution/view-reviewed-essay/${grade.essay_id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="essays">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Essays
                </CardTitle>
                <CardDescription>Essays written by all students in your institution</CardDescription>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Search by student or topic..."
                    value={essaysSearchTerm}
                    onChange={(e) => setEssaysSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                  <Select value={essaysStudentFilter} onValueChange={setEssaysStudentFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      {members
                        .filter(m => m.role === 'student' && m.status === 'active')
                        .map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profile?.display_name || 'Unknown Student'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingEssays ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredEssays.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No essays found
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Words</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEssays.map((essay) => {
                        const score = essay.teacher_score !== null ? essay.teacher_score : essay.ai_score;
                        return (
                          <TableRow key={essay.id}>
                            <TableCell>
                              <div className="font-medium">
                                {essay.member?.profile?.display_name || 'Unknown Student'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md truncate">{essay.topic || 'No topic'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{essay.exam_type}</Badge>
                            </TableCell>
                            <TableCell>{essay.word_count || 0}</TableCell>
                            <TableCell>
                              {score !== null ? (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  <span className="font-semibold">{score}</span>
                                  {essay.teacher_score !== null && (
                                    <Badge variant="secondary" className="ml-1 text-xs">Teacher</Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {essay.id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Find the submission to get essay_id
                                    const submission = essay.submission;
                                    if (submission?.essay_id) {
                                      navigate(`/institution/view-reviewed-essay/${submission.essay_id}`);
                                    } else {
                                      navigate(`/essay-review/${essay.id}`);
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(essay.created_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      All Assignments
                    </CardTitle>
                    <CardDescription>All assignments created for your institution</CardDescription>
                  </div>
                  <Button onClick={() => setCreateAssignmentOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assignment
                  </Button>
                </div>
                <Input
                  placeholder="Search assignments..."
                  value={assignmentsSearchTerm}
                  onChange={(e) => setAssignmentsSearchTerm(e.target.value)}
                  className="max-w-sm mt-2"
                />
              </CardHeader>
              <CardContent>
                {loadingAssignments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No assignments found
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div className="font-medium">{assignment.title}</div>
                            {assignment.topic && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {assignment.topic}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.exam_type}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {assignment.due_date 
                              ? format(new Date(assignment.due_date), 'MMM d, yyyy')
                              : 'No due date'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Total: {assignment.submissionStats?.total || 0}</div>
                              <div className="text-muted-foreground">
                                Submitted: {assignment.submissionStats?.submitted || 0} | 
                                Reviewed: {assignment.submissionStats?.reviewed || 0}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                              {assignment.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(assignment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSubmissions(assignment.id, assignment.isGrammar || false)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Submissions
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches">
            <BatchManager />
          </TabsContent>

          <TabsContent value="branding">
            <InstitutionBranding 
              institution={activeInstitution} 
              onUpdate={refreshMemberships} 
            />
          </TabsContent>
        </Tabs>

        {/* View Submissions Dialog */}
        <Dialog open={viewSubmissionsOpen} onOpenChange={setViewSubmissionsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assignment Submissions</DialogTitle>
              <DialogDescription>
                View all submissions for this assignment
              </DialogDescription>
            </DialogHeader>
            {loadingSubmissions ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : assignmentSubmissions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No submissions yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div className="font-medium">
                          {submission.member?.profile?.display_name || 'Unknown Student'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          submission.status === 'reviewed' ? 'default' :
                          submission.status === 'submitted' ? 'secondary' :
                          'outline'
                        }>
                          {submission.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {submission.submitted_at 
                          ? format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {submission.teacher_score !== null ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">{submission.teacher_score}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.essay_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/institution/view-reviewed-essay/${submission.essay_id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Essay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Assignment Dialog */}
        <Dialog open={createAssignmentOpen} onOpenChange={setCreateAssignmentOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
              <DialogDescription>
                Create a new assignment for your institution
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                To create assignments, please navigate to the Teacher Dashboard and use the Assignments section there.
              </p>
              <Button onClick={() => {
                setCreateAssignmentOpen(false);
                navigate('/teacher');
              }}>
                Go to Teacher Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <p className="text-center text-sm text-muted-foreground mt-8">
          ScoreWise for Institutes — Powered by Mithil & Hasti
        </p>
      </div>
    </PageLayout>
  );
}
