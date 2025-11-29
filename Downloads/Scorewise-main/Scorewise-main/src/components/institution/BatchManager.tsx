import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution, Institution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Users, Loader2, Pencil, Trash2, UserPlus, 
  FolderOpen, MoreHorizontal 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Batch {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  memberCount?: number;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profile?: {
    display_name: string | null;
  };
  isInBatch?: boolean;
}

export function BatchManager() {
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const { toast } = useToast();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [newBatch, setNewBatch] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeInstitution) {
      fetchBatches();
      fetchMembers();
    }
  }, [activeInstitution]);

  const fetchBatches = async () => {
    if (!activeInstitution) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('institution_id', activeInstitution.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch member counts for each batch
      const batchIds = data?.map(b => b.id) || [];
      const { data: batchMembers } = await supabase
        .from('batch_members')
        .select('batch_id')
        .in('batch_id', batchIds);

      const countMap = new Map<string, number>();
      batchMembers?.forEach(bm => {
        countMap.set(bm.batch_id, (countMap.get(bm.batch_id) || 0) + 1);
      });

      const enrichedBatches = (data || []).map(b => ({
        ...b,
        memberCount: countMap.get(b.id) || 0
      }));

      setBatches(enrichedBatches);
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!activeInstitution) return;
    try {
      const { data: membersData, error } = await supabase
        .from('institution_members')
        .select('*')
        .eq('institution_id', activeInstitution.id)
        .eq('status', 'active')
        .eq('role', 'student');

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
      })) as Member[];

      setMembers(enrichedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const createBatch = async () => {
    if (!activeInstitution || !user || !newBatch.name.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('batches')
        .insert({
          institution_id: activeInstitution.id,
          name: newBatch.name.trim(),
          description: newBatch.description.trim() || null,
          created_by: user.id
        });

      if (error) throw error;

      toast({ title: 'Batch created!' });
      setNewBatch({ name: '', description: '' });
      setCreateOpen(false);
      fetchBatches();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteBatch = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      toast({ title: 'Batch deleted' });
      fetchBatches();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openManageMembers = async (batch: Batch) => {
    setSelectedBatch(batch);
    
    // Fetch current batch members
    const { data: batchMembers } = await supabase
      .from('batch_members')
      .select('member_id')
      .eq('batch_id', batch.id);

    const memberIds = new Set(batchMembers?.map(bm => bm.member_id) || []);
    
    setMembers(prev => prev.map(m => ({
      ...m,
      isInBatch: memberIds.has(m.id)
    })));
    
    setManageOpen(true);
  };

  const toggleMemberInBatch = async (memberId: string, isCurrentlyInBatch: boolean) => {
    if (!selectedBatch) return;

    try {
      if (isCurrentlyInBatch) {
        await supabase
          .from('batch_members')
          .delete()
          .eq('batch_id', selectedBatch.id)
          .eq('member_id', memberId);
      } else {
        await supabase
          .from('batch_members')
          .insert({
            batch_id: selectedBatch.id,
            member_id: memberId
          });
      }

      setMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, isInBatch: !isCurrentlyInBatch } : m
      ));

      fetchBatches();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Batches / Classes
            </CardTitle>
            <CardDescription>Organize students into batches for better management</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Batch</DialogTitle>
                <DialogDescription>
                  Create a batch/class to group students together
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-name">Batch Name</Label>
                  <Input
                    id="batch-name"
                    placeholder="e.g., GRE Batch Jan 2025"
                    value={newBatch.name}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-desc">Description (optional)</Label>
                  <Textarea
                    id="batch-desc"
                    placeholder="Brief description of this batch..."
                    value={newBatch.description}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={createBatch} disabled={saving || !newBatch.name.trim()}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Batch
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
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No batches yet</p>
            <p className="text-sm">Create your first batch to organize students</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {batch.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {batch.memberCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={batch.is_active ? 'default' : 'secondary'}>
                      {batch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openManageMembers(batch)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Manage Students
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteBatch(batch.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Manage Members Dialog */}
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Students - {selectedBatch?.name}</DialogTitle>
              <DialogDescription>
                Select students to add to this batch
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
              {members.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No students in your institution yet
                </p>
              ) : (
                members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleMemberInBatch(member.id, !!member.isInBatch)}
                  >
                    <Checkbox checked={member.isInBatch} />
                    <span className="flex-1">{member.profile?.display_name || 'Student'}</span>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setManageOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
