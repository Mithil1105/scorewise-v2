import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Search, Shield, ShieldOff, Ban, UserPlus, Building2, Loader2, GraduationCap, BookOpen } from 'lucide-react';

interface InstitutionRole {
  institution_id: string;
  institution_name: string;
  role: 'student' | 'teacher' | 'inst_admin';
}

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  essay_count?: number;
  is_admin?: boolean;
  is_banned?: boolean;
  institutions?: string[];
  institution_roles?: InstitutionRole[];
}

interface Institution {
  id: string;
  name: string;
  code: string;
}

export default function UserManager() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Add to institution state
  const [addToInstOpen, setAddToInstOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [institutionRole, setInstitutionRole] = useState<'student' | 'teacher' | 'inst_admin'>('student');
  const [addingToInst, setAddingToInst] = useState(false);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch admin roles
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminUserIds = new Set(adminRoles?.map((r) => r.user_id) || []);

      // Fetch bans
      const { data: bans } = await supabase.from('user_bans').select('user_id');

      const bannedUserIds = new Set(bans?.map((b) => b.user_id) || []);

      // Fetch essay counts
      const { data: essays } = await supabase.from('essays').select('user_id');

      const essayCounts: Record<string, number> = {};
      essays?.forEach((e) => {
        essayCounts[e.user_id] = (essayCounts[e.user_id] || 0) + 1;
      });

      // Fetch institution memberships with roles
      const { data: memberships } = await supabase
        .from('institution_members')
        .select('user_id, institution_id, role')
        .eq('status', 'active');

      const { data: instData } = await supabase
        .from('institutions')
        .select('id, name');

      const instMap = new Map(instData?.map(i => [i.id, i.name]));
      
      const userInstitutions: Record<string, string[]> = {};
      const userInstitutionRoles: Record<string, InstitutionRole[]> = {};
      
      memberships?.forEach((m) => {
        const instName = instMap.get(m.institution_id);
        if (instName) {
          // Track institution names
          if (!userInstitutions[m.user_id]) {
            userInstitutions[m.user_id] = [];
          }
          userInstitutions[m.user_id].push(instName);
          
          // Track institution roles
          if (!userInstitutionRoles[m.user_id]) {
            userInstitutionRoles[m.user_id] = [];
          }
          userInstitutionRoles[m.user_id].push({
            institution_id: m.institution_id,
            institution_name: instName,
            role: m.role as 'student' | 'teacher' | 'inst_admin'
          });
        }
      });

      setUsers(
        profiles?.map((p) => ({
          ...p,
          essay_count: essayCounts[p.user_id] || 0,
          is_admin: adminUserIds.has(p.user_id),
          is_banned: bannedUserIds.has(p.user_id),
          institutions: userInstitutions[p.user_id] || [],
          institution_roles: userInstitutionRoles[p.user_id] || [],
        })) || []
      );
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setInstitutions(data || []);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchInstitutions();
  }, []);

  const handlePromoteToAdmin = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to promote ${displayName} to PLATFORM ADMIN? This will give them full access to the admin panel.`)) return;

    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'admin',
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already an admin');
        } else {
          throw error;
        }
        return;
      }

      await logAdminAction(user!.id, 'PROMOTE_TO_ADMIN', userId, { display_name: displayName } as Record<string, string>);
      toast.success(`${displayName} is now a Platform Admin`);
      fetchUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const handleDemoteFromAdmin = async (userId: string, displayName: string) => {
    if (userId === user?.id) {
      toast.error('You cannot demote yourself');
      return;
    }

    if (!confirm(`Are you sure you want to remove platform admin rights from ${displayName}?`)) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      await logAdminAction(user!.id, 'DEMOTE_FROM_ADMIN', userId, { display_name: displayName } as Record<string, string>);
      toast.success(`${displayName} is no longer a Platform Admin`);
      fetchUsers();
    } catch (error) {
      console.error('Error demoting user:', error);
      toast.error('Failed to demote user');
    }
  };

  const handleBanUser = async (userId: string, displayName: string) => {
    if (userId === user?.id) {
      toast.error('You cannot ban yourself');
      return;
    }

    if (!confirm(`Are you sure you want to ban ${displayName}?`)) return;

    try {
      const { error } = await supabase.from('user_bans').insert({
        user_id: userId,
        banned_by: user!.id,
        reason: 'Banned by admin',
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already banned');
        } else {
          throw error;
        }
        return;
      }

      await logAdminAction(user!.id, 'BAN_USER', userId, { display_name: displayName } as Record<string, string>);
      toast.success(`${displayName} has been banned`);
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to unban ${displayName}?`)) return;

    try {
      const { error } = await supabase.from('user_bans').delete().eq('user_id', userId);

      if (error) throw error;

      await logAdminAction(user!.id, 'UNBAN_USER', userId, { display_name: displayName } as Record<string, string>);
      toast.success(`${displayName} has been unbanned`);
      fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const openAddToInstitution = (profile: UserProfile) => {
    setSelectedUser(profile);
    setSelectedInstitutionId('');
    setInstitutionRole('student');
    setAddToInstOpen(true);
  };

  const openEditInstitution = (profile: UserProfile, institutionId: string) => {
    setSelectedUser(profile);
    setSelectedInstitutionId(institutionId);
    
    // Find current role for this institution
    const currentRole = profile.institution_roles?.find(
      ir => ir.institution_id === institutionId
    );
    setInstitutionRole(currentRole?.role || 'student');
    setAddToInstOpen(true);
  };

  const handleAddToInstitution = async () => {
    if (!selectedUser || !selectedInstitutionId) return;
    
    setAddingToInst(true);
    try {
      // Check if already a member
      const { data: existing } = await supabase
        .from('institution_members')
        .select('id, role, status')
        .eq('user_id', selectedUser.user_id)
        .eq('institution_id', selectedInstitutionId)
        .maybeSingle();

      if (existing) {
        // Update existing membership role and status
        const { error: updateError } = await supabase
          .from('institution_members')
          .update({
            role: institutionRole,
            status: 'active',
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;

        const inst = institutions.find(i => i.id === selectedInstitutionId);
        await logAdminAction(user!.id, 'UPDATE_USER_INSTITUTION_ROLE', selectedUser.user_id, {
          user_name: selectedUser.display_name,
          institution_name: inst?.name,
          old_role: existing.role,
          new_role: institutionRole,
        } as Record<string, string>);

        toast.success(`${selectedUser.display_name} role updated to ${institutionRole} in ${inst?.name}`);
      } else {
        // Create new membership
      const { error } = await supabase.from('institution_members').insert({
        user_id: selectedUser.user_id,
        institution_id: selectedInstitutionId,
        role: institutionRole,
        status: 'active',
      });

      if (error) throw error;

      const inst = institutions.find(i => i.id === selectedInstitutionId);
      await logAdminAction(user!.id, 'ADD_USER_TO_INSTITUTION', selectedUser.user_id, {
        user_name: selectedUser.display_name,
        institution_name: inst?.name,
        role: institutionRole,
      } as Record<string, string>);

        toast.success(`${selectedUser.display_name} added to ${inst?.name} as ${institutionRole}`);
      }

      setAddToInstOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding to institution:', error);
      toast.error(error.message || 'Failed to add user to institution');
    } finally {
      setAddingToInst(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="User Manager">
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>
            Manage platform users, assign admin roles, and add users to institutions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Institutions</TableHead>
                    <TableHead>Essays</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              {profile.display_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="font-medium">
                            {profile.display_name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {profile.is_admin && (
                            <Badge variant="default">Platform Admin</Badge>
                          )}
                          {profile.is_banned && (
                            <Badge variant="destructive">Banned</Badge>
                          )}
                          {profile.institution_roles && profile.institution_roles.length > 0 ? (
                            profile.institution_roles.map((ir, idx) => {
                              const getRoleIcon = () => {
                                switch (ir.role) {
                                  case 'student': return <GraduationCap className="h-3 w-3 mr-1" />;
                                  case 'teacher': return <BookOpen className="h-3 w-3 mr-1" />;
                                  case 'inst_admin': return <Shield className="h-3 w-3 mr-1" />;
                                  default: return null;
                                }
                              };
                              return (
                                <Badge 
                                  key={idx} 
                                  variant={ir.role === 'inst_admin' ? 'default' : ir.role === 'teacher' ? 'secondary' : 'outline'}
                                  className="capitalize flex items-center"
                                >
                                  {getRoleIcon()}
                                  {ir.role.replace('_', ' ')}
                                </Badge>
                              );
                            })
                          ) : !profile.is_admin && !profile.is_banned && (
                            <Badge variant="secondary">User</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {profile.institution_roles && profile.institution_roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {profile.institution_roles.slice(0, 2).map((ir, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-muted"
                                onClick={() => openEditInstitution(profile, ir.institution_id)}
                                title={`Click to edit role (currently ${ir.role})`}
                              >
                                <Building2 className="h-3 w-3 mr-1" />
                                {ir.institution_name}
                              </Badge>
                            ))}
                            {profile.institution_roles.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{profile.institution_roles.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>{profile.essay_count}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openAddToInstitution(profile)}
                            title="Add to Institution"
                          >
                            <Building2 className="h-4 w-4" />
                          </Button>
                          {profile.is_admin ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleDemoteFromAdmin(
                                  profile.user_id,
                                  profile.display_name || 'Unknown'
                                )
                              }
                              title="Remove Platform Admin"
                              disabled={profile.user_id === user?.id}
                            >
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handlePromoteToAdmin(
                                  profile.user_id,
                                  profile.display_name || 'Unknown'
                                )
                              }
                              title="Make Platform Admin"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                          {profile.is_banned ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleUnbanUser(
                                  profile.user_id,
                                  profile.display_name || 'Unknown'
                                )
                              }
                              title="Unban User"
                            >
                              <Ban className="h-4 w-4 text-green-500" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() =>
                                handleBanUser(
                                  profile.user_id,
                                  profile.display_name || 'Unknown'
                                )
                              }
                              title="Ban User"
                              disabled={profile.user_id === user?.id}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Institution Dialog */}
      <Dialog open={addToInstOpen} onOpenChange={setAddToInstOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedInstitutionId ? 'Edit User Institution Role' : 'Add User to Institution'}
            </DialogTitle>
            <DialogDescription>
              {selectedInstitutionId 
                ? `Update ${selectedUser?.display_name}'s role in this institution`
                : `Add ${selectedUser?.display_name} to an institution with a specific role`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Institution</Label>
              <Select 
                value={selectedInstitutionId} 
                onValueChange={(value) => {
                  setSelectedInstitutionId(value);
                  // Update role when institution changes
                  const currentRole = selectedUser?.institution_roles?.find(
                    ir => ir.institution_id === value
                  );
                  if (currentRole) {
                    setInstitutionRole(currentRole.role);
                  } else {
                    setInstitutionRole('student');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an institution..." />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => {
                    const currentRole = selectedUser?.institution_roles?.find(
                      ir => ir.institution_id === inst.id
                    );
                    return (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                        {currentRole && ` - Current: ${currentRole.role.replace('_', ' ')}`}
                    </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedInstitutionId && selectedUser?.institution_roles?.find(
                ir => ir.institution_id === selectedInstitutionId
              ) && (
                <p className="text-xs text-muted-foreground">
                  User is already a member of this institution
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={institutionRole} onValueChange={(v) => setInstitutionRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="inst_admin">Institution Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddToInstOpen(false);
              setSelectedInstitutionId('');
              setSelectedUser(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddToInstitution} disabled={!selectedInstitutionId || addingToInst}>
              {addingToInst && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedInstitutionId ? 'Update Role' : 'Add to Institution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}