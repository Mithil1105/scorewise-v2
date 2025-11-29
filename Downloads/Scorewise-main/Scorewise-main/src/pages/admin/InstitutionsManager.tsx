import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, logAdminAction } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, Users, Loader2, Search, Power, PowerOff, Copy, Plus, 
  UserPlus, Edit, Shield, GraduationCap, BookOpen, Settings
} from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  code: string;
  owner_user_id: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  logo_url: string | null;
  theme_color: string | null;
  member_count?: number;
  owner_name?: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile?: {
    display_name: string | null;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
}

export default function InstitutionsManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create institution state
  const [createOpen, setCreateOpen] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newInstPlan, setNewInstPlan] = useState('free');
  const [creating, setCreating] = useState(false);
  
  // Edit institution state
  const [editOpen, setEditOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlan, setEditPlan] = useState('free');
  const [editThemeColor, setEditThemeColor] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Add member state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'student' | 'teacher' | 'inst_admin'>('student');
  const [addingMember, setAddingMember] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/access-denied');
      return;
    }
    if (isAdmin) {
      fetchInstitutions();
      fetchAllUsers();
    }
  }, [isAdmin, adminLoading]);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const { data: instData, error } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: memberCounts } = await supabase
        .from('institution_members')
        .select('institution_id')
        .eq('status', 'active');

      const countMap = new Map<string, number>();
      memberCounts?.forEach(m => {
        countMap.set(m.institution_id, (countMap.get(m.institution_id) || 0) + 1);
      });

      const ownerIds = instData?.map(i => i.owner_user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', ownerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]));

      const enriched = (instData || []).map(inst => ({
        ...inst,
        member_count: countMap.get(inst.id) || 0,
        owner_name: profileMap.get(inst.owner_user_id) || 'Unknown'
      }));

      setInstitutions(enriched);
    } catch (err) {
      console.error('Error fetching institutions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name')
        .order('display_name');
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchInstitutionMembers = async (institutionId: string) => {
    setMembersLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('institution_members')
        .select('*')
        .eq('institution_id', institutionId);

      if (error) throw error;

      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      const enrichedMembers = (membersData || []).map(m => ({
        ...m,
        profile: profileMap.get(m.user_id)
      }));

      setMembers(enrichedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SW-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInstitution = async () => {
    if (!newInstName.trim() || !user) return;
    
    setCreating(true);
    try {
      const code = generateCode();
      
      const { data: inst, error } = await supabase
        .from('institutions')
        .insert({
          name: newInstName.trim(),
          code,
          owner_user_id: user.id,
          plan: newInstPlan,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as inst_admin
      const { error: memberError } = await supabase
        .from('institution_members')
        .insert({
          institution_id: inst.id,
          user_id: user.id,
          role: 'inst_admin',
          status: 'active'
        });

      if (memberError) throw memberError;

      await logAdminAction(user.id, 'CREATE_INSTITUTION', inst.id, { name: newInstName, code });
      
      toast({ title: 'Institution created!', description: `Code: ${code}` });
      setCreateOpen(false);
      setNewInstName('');
      setNewInstPlan('free');
      fetchInstitutions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (inst: Institution) => {
    setEditingInst(inst);
    setEditName(inst.name);
    setEditPlan(inst.plan);
    setEditThemeColor(inst.theme_color || '');
    setEditOpen(true);
  };

  const saveInstitution = async () => {
    if (!editingInst || !user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('institutions')
        .update({
          name: editName.trim(),
          plan: editPlan,
          theme_color: editThemeColor || null
        })
        .eq('id', editingInst.id);

      if (error) throw error;

      await logAdminAction(user.id, 'UPDATE_INSTITUTION', editingInst.id, { 
        name: editName, 
        plan: editPlan 
      });
      
      toast({ title: 'Institution updated!' });
      setEditOpen(false);
      fetchInstitutions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleInstitutionStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('institutions')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      
      if (user) {
        await logAdminAction(user.id, isActive ? 'DEACTIVATE_INSTITUTION' : 'ACTIVATE_INSTITUTION', id);
      }
      
      toast({ 
        title: isActive ? 'Institution deactivated' : 'Institution activated' 
      });
      fetchInstitutions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openMembersDialog = (inst: Institution) => {
    setSelectedInstitution(inst);
    setAddMemberOpen(true);
    fetchInstitutionMembers(inst.id);
  };

  const addMemberToInstitution = async () => {
    if (!selectedInstitution || !selectedUserId || !user) return;
    
    // Check if user is already a member
    const existingMember = members.find(m => m.user_id === selectedUserId);
    if (existingMember) {
      toast({ title: 'Error', description: 'User is already a member of this institution', variant: 'destructive' });
      return;
    }
    
    setAddingMember(true);
    try {
      const { error } = await supabase
        .from('institution_members')
        .insert({
          institution_id: selectedInstitution.id,
          user_id: selectedUserId,
          role: memberRole,
          status: 'active'
        });

      if (error) throw error;

      const addedUser = allUsers.find(u => u.user_id === selectedUserId);
      await logAdminAction(user.id, 'ADD_MEMBER_TO_INSTITUTION', selectedInstitution.id, { 
        user_id: selectedUserId, 
        user_name: addedUser?.display_name,
        role: memberRole 
      });
      
      toast({ title: 'Member added!' });
      setSelectedUserId('');
      setMemberRole('student');
      fetchInstitutionMembers(selectedInstitution.id);
      fetchInstitutions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const { error } = await supabase
        .from('institution_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      toast({ title: 'Member removed!' });
      if (selectedInstitution) {
        fetchInstitutionMembers(selectedInstitution.id);
      }
      fetchInstitutions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('institution_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      toast({ title: 'Role updated!' });
      if (selectedInstitution) {
        fetchInstitutionMembers(selectedInstitution.id);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Code copied!', description: code });
  };

  const filteredInstitutions = institutions.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    u.display_name?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'inst_admin': return <Shield className="h-4 w-4" />;
      case 'teacher': return <BookOpen className="h-4 w-4" />;
      case 'student': return <GraduationCap className="h-4 w-4" />;
      default: return null;
    }
  };

  if (adminLoading) {
    return (
      <AdminLayout title="Institutions Manager">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Institutions Manager">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Institutions Manager
            </h1>
            <p className="text-muted-foreground">
              Create, manage, and configure all institutions
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {institutions.length} Total
            </Badge>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Institution
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Institution</DialogTitle>
                  <DialogDescription>
                    Create a new coaching institution on the platform
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Institution Name</Label>
                    <Input
                      placeholder="e.g., Elite GRE Academy"
                      value={newInstName}
                      onChange={(e) => setNewInstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select value={newInstPlan} onValueChange={setNewInstPlan}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createInstitution} disabled={!newInstName.trim() || creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Institutions</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {institutions.filter(i => i.is_active).length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Members</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {institutions.reduce((sum, i) => sum + (i.member_count || 0), 0)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inactive</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {institutions.filter(i => !i.is_active).length}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search institutions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredInstitutions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No institutions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstitutions.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {inst.code}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => copyCode(inst.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{inst.owner_name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => openMembersDialog(inst)}
                        >
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {inst.member_count}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {inst.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={inst.is_active ? 'default' : 'destructive'}>
                          {inst.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(inst.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(inst)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openMembersDialog(inst)}
                            title="Manage Members"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleInstitutionStatus(inst.id, inst.is_active)}
                            title={inst.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {inst.is_active ? (
                              <PowerOff className="h-4 w-4 text-destructive" />
                            ) : (
                              <Power className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Institution Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Institution</DialogTitle>
              <DialogDescription>
                Update institution details and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Theme Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editThemeColor || '#6366f1'}
                    onChange={(e) => setEditThemeColor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={editThemeColor}
                    onChange={(e) => setEditThemeColor(e.target.value)}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveInstitution} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Members Management Dialog */}
        <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedInstitution?.name} - Members
              </DialogTitle>
              <DialogDescription>
                Add users to this institution and manage their roles
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="add" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add">Add Member</TabsTrigger>
                <TabsTrigger value="list">Current Members ({members.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="add" className="space-y-4">
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Search User</Label>
                    <Input
                      placeholder="Search by name..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUsers.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.display_name || 'Unknown User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={memberRole} onValueChange={(v) => setMemberRole(v as any)}>
                      <SelectTrigger>
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
                            <Shield className="h-4 w-4" /> Institution Admin
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={addMemberToInstitution} 
                    disabled={!selectedUserId || addingMember}
                    className="w-full"
                  >
                    {addingMember && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="list">
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No members yet
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>{member.profile?.display_name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Select
                                value={member.role}
                                onValueChange={(v) => updateMemberRole(member.id, v)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="teacher">Teacher</SelectItem>
                                  <SelectItem value="inst_admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                {member.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => removeMember(member.id)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}