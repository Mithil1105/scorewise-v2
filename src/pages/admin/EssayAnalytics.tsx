import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAdminAction } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Search, Eye, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';

interface Essay {
  id: string;
  user_id: string;
  topic: string | null;
  essay_text: string | null;
  word_count: number | null;
  ai_score: number | null;
  ai_feedback: string | null;
  exam_type: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export default function EssayAnalytics() {
  const { user } = useAuth();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState<string>('all');
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchEssays = async () => {
    try {
      let query = supabase
        .from('essays')
        .select('*')
        .order('created_at', { ascending: false });

      if (examFilter !== 'all') {
        query = query.eq('exam_type', examFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user emails
      const userIds = [...new Set(data?.map((e) => e.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);

      setEssays(
        data?.map((e) => ({
          ...e,
          user_email: profileMap.get(e.user_id) || 'Unknown',
        })) || []
      );
    } catch (error) {
      console.error('Error fetching essays:', error);
      toast.error('Failed to fetch essays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEssays();
  }, [examFilter]);

  const handleRegrade = async (essay: Essay) => {
    toast.info('Regrading essay...');
    // This would call the AI scoring edge function
    // For now, just log the action
    await logAdminAction(user!.id, 'REGRADE_ESSAY', essay.id);
    toast.success('Essay regrade initiated');
  };

  const handleMarkVerified = async (essay: Essay) => {
    await logAdminAction(user!.id, 'VERIFY_ESSAY', essay.id);
    toast.success('Essay marked as verified');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this essay?')) return;

    try {
      const { error } = await supabase.from('essays').delete().eq('id', id);

      if (error) throw error;

      await logAdminAction(user!.id, 'DELETE_ESSAY', id);
      toast.success('Essay deleted successfully');
      fetchEssays();
    } catch (error) {
      console.error('Error deleting essay:', error);
      toast.error('Failed to delete essay');
    }
  };

  const viewEssay = (essay: Essay) => {
    setSelectedEssay(essay);
    setIsViewDialogOpen(true);
  };

  const filteredEssays = essays.filter(
    (e) =>
      e.topic?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Essay Analytics">
      <Card>
        <CardHeader>
          <CardTitle>All Essays ({essays.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by topic or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                <SelectItem value="GRE">GRE</SelectItem>
                <SelectItem value="IELTS Task 1">IELTS Task 1</SelectItem>
                <SelectItem value="IELTS Task 2">IELTS Task 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredEssays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No essays found
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEssays.map((essay) => (
                    <TableRow key={essay.id}>
                      <TableCell className="font-medium">
                        {essay.user_email}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {essay.topic || 'No topic'}
                      </TableCell>
                      <TableCell>{essay.exam_type}</TableCell>
                      <TableCell>{essay.word_count || 0}</TableCell>
                      <TableCell>
                        {essay.ai_score !== null ? (
                          <span className="font-semibold">{Number(essay.ai_score).toFixed(1)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(essay.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => viewEssay(essay)}
                            title="View Essay"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRegrade(essay)}
                            title="Regrade"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMarkVerified(essay)}
                            title="Mark Verified"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(essay.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Essay Details</DialogTitle>
          </DialogHeader>
          {selectedEssay && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Exam Type
                  </label>
                  <p>{selectedEssay.exam_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Score
                  </label>
                  <p className="text-xl font-bold">
                    {selectedEssay.ai_score !== null ? Number(selectedEssay.ai_score).toFixed(1) : 'Not scored'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Word Count
                  </label>
                  <p>{selectedEssay.word_count || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    User
                  </label>
                  <p>{selectedEssay.user_email}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Topic
                </label>
                <p className="p-3 bg-muted rounded-lg">
                  {selectedEssay.topic || 'No topic'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Essay
                </label>
                <div className="p-3 bg-muted rounded-lg max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {selectedEssay.essay_text || 'No content'}
                </div>
              </div>

              {selectedEssay.ai_feedback && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    AI Feedback
                  </label>
                  <div className="p-3 bg-muted rounded-lg max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    {selectedEssay.ai_feedback}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
