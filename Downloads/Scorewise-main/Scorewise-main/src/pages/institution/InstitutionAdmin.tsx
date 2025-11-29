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
  Loader2, Shield, GraduationCap, BookOpen, Clock, Paintbrush, FolderOpen
} from 'lucide-react';
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

    // Only redirect to access denied if we've confirmed the user doesn't have access
    // This prevents race conditions where activeMembership might be null temporarily
    if (user && (!activeMembership || activeMembership.role !== 'inst_admin' || activeMembership.status !== 'active')) {
      navigate('/access-denied');
      return;
    }

    // If we have valid access, fetch members
    if (activeMembership && activeMembership.role === 'inst_admin' && activeMembership.status === 'active') {
    fetchMembers();
    }
  }, [user, activeMembership, authLoading, institutionLoading, navigate]);

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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      const enrichedMembers = (membersData || []).map(m => ({
        ...m,
        profile: profileMap.get(m.user_id)
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

  const filteredMembers = members.filter(m => 
    m.profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Members
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
