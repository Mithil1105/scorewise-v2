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

interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  mf_example: string | null;
  friends_example: string | null;
  gg_example: string | null;
  tbbt_example: string | null;
  created_at: string;
}

export default function VocabularyManager() {
  const { user } = useAuth();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [newWord, setNewWord] = useState({
    word: '',
    meaning: '',
    mf_example: '',
    friends_example: '',
    gg_example: '',
    tbbt_example: '',
  });

  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from('vocab_words')
        .select('*')
        .order('word', { ascending: true });

      if (error) throw error;
      setWords(data || []);
    } catch (error) {
      console.error('Error fetching words:', error);
      toast.error('Failed to fetch vocabulary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const handleAdd = async () => {
    if (!newWord.word.trim() || !newWord.meaning.trim()) {
      toast.error('Word and meaning are required');
      return;
    }

    try {
      const { error } = await supabase.from('vocab_words').insert({
        word: newWord.word.trim(),
        meaning: newWord.meaning.trim(),
        mf_example: newWord.mf_example.trim() || null,
        friends_example: newWord.friends_example.trim() || null,
        gg_example: newWord.gg_example.trim() || null,
        tbbt_example: newWord.tbbt_example.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('This word already exists');
        } else {
          throw error;
        }
        return;
      }

      await logAdminAction(user!.id, 'CREATE_VOCAB_WORD', undefined, {
        word: newWord.word,
      } as Record<string, string>);
      toast.success('Word added successfully');
      setNewWord({
        word: '',
        meaning: '',
        mf_example: '',
        friends_example: '',
        gg_example: '',
        tbbt_example: '',
      });
      setIsDialogOpen(false);
      fetchWords();
    } catch (error) {
      console.error('Error adding word:', error);
      toast.error('Failed to add word');
    }
  };

  const handleUpdate = async () => {
    if (!editingWord) return;

    try {
      const { error } = await supabase
        .from('vocab_words')
        .update({
          word: editingWord.word,
          meaning: editingWord.meaning,
          mf_example: editingWord.mf_example,
          friends_example: editingWord.friends_example,
          gg_example: editingWord.gg_example,
          tbbt_example: editingWord.tbbt_example,
        })
        .eq('id', editingWord.id);

      if (error) throw error;

      await logAdminAction(user!.id, 'UPDATE_VOCAB_WORD', editingWord.id);
      toast.success('Word updated successfully');
      setEditingWord(null);
      fetchWords();
    } catch (error) {
      console.error('Error updating word:', error);
      toast.error('Failed to update word');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this word?')) return;

    try {
      const { error } = await supabase.from('vocab_words').delete().eq('id', id);

      if (error) throw error;

      await logAdminAction(user!.id, 'DELETE_VOCAB_WORD', id);
      toast.success('Word deleted successfully');
      fetchWords();
    } catch (error) {
      console.error('Error deleting word:', error);
      toast.error('Failed to delete word');
    }
  };

  const filteredWords = words.filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaning.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Vocabulary Manager">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vocabulary Words ({words.length})</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Word
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Vocabulary Word</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Word *</label>
                    <Input
                      placeholder="Enter word"
                      value={newWord.word}
                      onChange={(e) =>
                        setNewWord({ ...newWord, word: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Meaning *</label>
                    <Input
                      placeholder="Enter meaning"
                      value={newWord.meaning}
                      onChange={(e) =>
                        setNewWord({ ...newWord, meaning: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Modern Family Example</label>
                  <Textarea
                    placeholder="Example from Modern Family..."
                    value={newWord.mf_example}
                    onChange={(e) =>
                      setNewWord({ ...newWord, mf_example: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Friends Example</label>
                  <Textarea
                    placeholder="Example from Friends..."
                    value={newWord.friends_example}
                    onChange={(e) =>
                      setNewWord({ ...newWord, friends_example: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Gilmore Girls Example</label>
                  <Textarea
                    placeholder="Example from Gilmore Girls..."
                    value={newWord.gg_example}
                    onChange={(e) =>
                      setNewWord({ ...newWord, gg_example: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">TBBT Example</label>
                  <Textarea
                    placeholder="Example from The Big Bang Theory..."
                    value={newWord.tbbt_example}
                    onChange={(e) =>
                      setNewWord({ ...newWord, tbbt_example: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <Button onClick={handleAdd} className="w-full">
                  Add Word
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search words..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredWords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No words found
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Word</TableHead>
                    <TableHead>Meaning</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWords.map((word) => (
                    <TableRow key={word.id}>
                      <TableCell className="font-medium">{word.word}</TableCell>
                      <TableCell>{word.meaning}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingWord(word)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(word.id)}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingWord} onOpenChange={(open) => !open && setEditingWord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vocabulary Word</DialogTitle>
          </DialogHeader>
          {editingWord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Word</label>
                  <Input
                    value={editingWord.word}
                    onChange={(e) =>
                      setEditingWord({ ...editingWord, word: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Meaning</label>
                  <Input
                    value={editingWord.meaning}
                    onChange={(e) =>
                      setEditingWord({ ...editingWord, meaning: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Modern Family Example</label>
                <Textarea
                  value={editingWord.mf_example || ''}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, mf_example: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Friends Example</label>
                <Textarea
                  value={editingWord.friends_example || ''}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, friends_example: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gilmore Girls Example</label>
                <Textarea
                  value={editingWord.gg_example || ''}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, gg_example: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">TBBT Example</label>
                <Textarea
                  value={editingWord.tbbt_example || ''}
                  onChange={(e) =>
                    setEditingWord({ ...editingWord, tbbt_example: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
