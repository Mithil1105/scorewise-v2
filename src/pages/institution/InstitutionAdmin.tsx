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
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, Copy, Users, UserCheck, UserX, 
  Loader2, Shield, GraduationCap, BookOpen, Clock, Paintbrush, FolderOpen,
  Award, FileText, TrendingUp, Star, Eye, Search
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
  
  // All Assignments state
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsSearchTerm, setAssignmentsSearchTerm] = useState('');

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

    // Give a small delay to allow institution context to restore from localStorage
    // This prevents race conditions where activeMembership might be null temporarily
    if (!activeMembership) {
      // Wait a bit longer - institution context might still be restoring
      const timeout = setTimeout(() => {
        if (!activeMembership) {
          navigate('/access-denied');
        }
      }, 1000); // Give 1 second for context to restore
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

      if (memberIds.length === 0) {
        setAllEssays([]);
        setLoadingEssays(false);
        return;
      }

      // Get all submissions for these members
      const { data: submissionsData } = await supabase
        .from("assignment_submissions")
        .select("id, essay_id, member_id, submitted_at, status")
        .in("member_id", memberIds);

      const essayIds = [...new Set(submissionsData?.map(s => s.essay_id).filter(Boolean) || [])];

      if (essayIds.length === 0) {
        setAllEssays([]);
        setLoadingEssays(false);
        return;
      }

      // Fetch essays
      const { data: essaysData } = await supabase
        .from("essays")
        .select("id, essay_text, exam_type, topic, word_count, created_at")
        .in("id", essayIds)
        .order("created_at", { ascending: false });

      // Fetch members and profiles
      const submissionMemberIds = [...new Set(submissionsData?.map(s => s.member_id) || [])];
      const { data: membersWithProfiles } = await supabase
        .from("institution_members")
        .select("id, user_id")
        .in("id", submissionMemberIds);

      const userIds = membersWithProfiles?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      // Create maps
      const submissionMap = new Map(submissionsData?.map(s => [s.essay_id, s]) || []);
      const memberMap = new Map(membersWithProfiles?.map(m => [m.id, m]) || []);
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Combine data
      const enrichedEssays = (essaysData || []).map(essay => {
        const submission = submissionMap.get(essay.id);
        const member = submission ? memberMap.get(submission.member_id) : null;
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
      const { data: assignmentsData, error } = await supabase
        .from("assignments")
        .select("id, title, topic, instructions, exam_type, due_date, created_at, is_active")
        .eq("institution_id", activeInstitution.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch submission stats
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      if (assignmentIds.length > 0) {
        const { data: submissionsData } = await supabase
          .from("assignment_submissions")
          .select("assignment_id, status")
          .in("assignment_id", assignmentIds);

        // Calculate stats for each assignment
        const statsMap = new Map<string, { total: number; submitted: number; reviewed: number }>();
        
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

        const enrichedAssignments = (assignmentsData || []).map(assignment => ({
          ...assignment,
          submissionStats: statsMap.get(assignment.id) || { total: 0, submitted: 0, reviewed: 0 }
        }));

        setAllAssignments(enrichedAssignments);
      } else {
        setAllAssignments([]);
      }
    } catch (err: any) {
      console.error('Error fetching all assignments:', err);
      toast({ title: 'Error', description: 'Failed to load assignments', variant: 'destructive' });
    } finally {
      setLoadingAssignments(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter recent grades based on search term
  const filteredGrades = recentGrades.filter(grade => {
    if (!gradesSearchTerm) return true;
    const search = gradesSearchTerm.toLowerCase();
    const studentName = grade.member?.profile?.display_name?.toLowerCase() || '';
    const assignmentTitle = grade.assignment?.title?.toLowerCase() || '';
    return studentName.includes(search) || assignmentTitle.includes(search);
  });

  // Filter all essays based on search term
  const filteredEssays = allEssays.filter(essay => {
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

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Members</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{activeCount}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Requests</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{pendingCount}</span>
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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-4xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Members
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
                        <TableRow key={member.id}>
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Members</span>
                    <span className="text-2xl font-bold">{members.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Students</span>
                    <span className="text-2xl font-bold">
                      {members.filter(m => m.role === 'student' && m.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Teachers</span>
                    <span className="text-2xl font-bold">
                      {members.filter(m => m.role === 'teacher' && m.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Approvals</span>
                    <span className="text-2xl font-bold text-amber-500">{pendingCount}</span>
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
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    const membersTab = document.querySelector('[value="members"]') as HTMLElement;
                    membersTab?.click();
                  }}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    const gradesTab = document.querySelector('[value="grades"]') as HTMLElement;
                    gradesTab?.click();
                  }}>
                    <Award className="h-4 w-4 mr-2" />
                    View Recent Grades
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    const essaysTab = document.querySelector('[value="essays"]') as HTMLElement;
                    essaysTab?.click();
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    View All Essays
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
                <Input
                  placeholder="Search by student or topic..."
                  value={essaysSearchTerm}
                  onChange={(e) => setEssaysSearchTerm(e.target.value)}
                  className="max-w-sm mt-2"
                />
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEssays.map((essay) => {
                        const score = essay.teacher_score !== null ? essay.teacher_score : essay.ai_score;
                        return (
                          <TableRow key={essay.id}>
                            <TableCell>
                              <div className="font-medium">
                                {essay.profile?.display_name || 'Unknown Student'}
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
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  All Assignments
                </CardTitle>
                <CardDescription>All assignments created for your institution</CardDescription>
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

        <p className="text-center text-sm text-muted-foreground mt-8">
          ScoreWise for Institutes — Powered by Mithil & Hasti
        </p>
      </div>
    </PageLayout>
  );
}
