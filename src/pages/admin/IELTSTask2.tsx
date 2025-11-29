import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Upload } from 'lucide-react';

interface IELTSTask2Topic {
  id: string;
  topic: string;
  created_at: string;
  updated_at: string;
}

export default function IELTSTask2() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<IELTSTask2Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingTopic, setEditingTopic] = useState<IELTSTask2Topic | null>(null);
  const [newTopic, setNewTopic] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('ielts_t2')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleAdd = async () => {
    if (!newTopic.trim()) {
      toast.error('Topic cannot be empty');
      return;
    }

    try {
      const { error } = await supabase.from('ielts_t2').insert({ topic: newTopic.trim() });

      if (error) {
        if (error.code === '23505') {
          toast.error('This topic already exists');
        } else {
          throw error;
        }
        return;
      }

      await logAdminAction(user!.id, 'CREATE_IELTS_T2', undefined, { topic: newTopic } as Record<string, string>);
      toast.success('Topic added successfully');
      setNewTopic('');
      setIsDialogOpen(false);
      fetchTopics();
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Failed to add topic');
    }
  };

  const handleUpdate = async () => {
    if (!editingTopic || !editingTopic.topic.trim()) {
      toast.error('Topic cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('ielts_t2')
        .update({ topic: editingTopic.topic.trim() })
        .eq('id', editingTopic.id);

      if (error) throw error;

      await logAdminAction(user!.id, 'UPDATE_IELTS_T2', editingTopic.id, {
        topic: editingTopic.topic,
      } as Record<string, string>);
      toast.success('Topic updated successfully');
      setEditingTopic(null);
      fetchTopics();
    } catch (error) {
      console.error('Error updating topic:', error);
      toast.error('Failed to update topic');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      const { error } = await supabase.from('ielts_t2').delete().eq('id', id);

      if (error) throw error;

      await logAdminAction(user!.id, 'DELETE_IELTS_T2', id);
      toast.success('Topic deleted successfully');
      fetchTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast.error('Failed to delete topic');
    }
  };

  const handleBulkUpload = async () => {
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      toast.error('No valid topics found');
      return;
    }

    try {
      const { error } = await supabase
        .from('ielts_t2')
        .insert(lines.map((topic) => ({ topic })));

      if (error) throw error;

      await logAdminAction(user!.id, 'BULK_UPLOAD_IELTS_T2', undefined, {
        count: lines.length,
      } as Record<string, number>);
      toast.success(`${lines.length} topics uploaded successfully`);
      setBulkText('');
      setIsBulkDialogOpen(false);
      fetchTopics();
    } catch (error: any) {
      console.error('Error bulk uploading:', error);
      if (error.code === '23505') {
        toast.error('Some topics already exist. Please remove duplicates.');
      } else {
        toast.error('Failed to upload topics');
      }
    }
  };

  const filteredTopics = topics.filter((t) =>
    t.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Manage IELTS Task 2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>IELTS Task 2 Topics ({topics.length})</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Topics</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter one topic per line..."
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={10}
                  />
                  <Button onClick={handleBulkUpload} className="w-full">
                    Upload Topics
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Topic</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter the IELTS Task 2 topic..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    rows={4}
                  />
                  <Button onClick={handleAdd} className="w-full">
                    Add Topic
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No topics found
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead className="w-[150px]">Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTopics.map((topic) => (
                    <TableRow key={topic.id}>
                      <TableCell>
                        {editingTopic?.id === topic.id ? (
                          <Textarea
                            value={editingTopic.topic}
                            onChange={(e) =>
                              setEditingTopic({ ...editingTopic, topic: e.target.value })
                            }
                            rows={2}
                          />
                        ) : (
                          <p className="line-clamp-2">{topic.topic}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(topic.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {editingTopic?.id === topic.id ? (
                            <>
                              <Button size="sm" onClick={handleUpdate}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTopic(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingTopic(topic)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDelete(topic.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
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
    </AdminLayout>
  );
}
