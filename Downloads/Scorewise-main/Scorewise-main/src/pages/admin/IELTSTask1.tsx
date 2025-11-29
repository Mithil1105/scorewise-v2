import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Pencil, Trash2, Search, Image } from 'lucide-react';

interface IELTSTask1Item {
  id: string;
  title: string;
  image_base64: string | null;
  image_type: string | null;
  created_at: string;
  updated_at: string;
}

export default function IELTSTask1() {
  const { user } = useAuth();
  const [items, setItems] = useState<IELTSTask1Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IELTSTask1Item | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newImageType, setNewImageType] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('ielts_t1')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch IELTS Task 1 items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setNewImage(base64.split(',')[1]);
      setNewImageType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      const { error } = await supabase.from('ielts_t1').insert({
        title: newTitle.trim(),
        image_base64: newImage,
        image_type: newImageType,
      });

      if (error) throw error;

      await logAdminAction(user!.id, 'CREATE_IELTS_T1', undefined, { title: newTitle } as Record<string, string>);
      toast.success('Item added successfully');
      setNewTitle('');
      setNewImage(null);
      setNewImageType(null);
      setIsDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('ielts_t1')
        .update({
          title: editingItem.title,
          image_base64: newImage || editingItem.image_base64,
          image_type: newImageType || editingItem.image_type,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      await logAdminAction(user!.id, 'UPDATE_IELTS_T1', editingItem.id);
      toast.success('Item updated successfully');
      setEditingItem(null);
      setNewImage(null);
      setNewImageType(null);
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('ielts_t1').delete().eq('id', id);

      if (error) throw error;

      await logAdminAction(user!.id, 'DELETE_IELTS_T1', id);
      toast.success('Item deleted successfully');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Manage IELTS Task 1">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>IELTS Task 1 Prompts ({items.length})</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New IELTS Task 1 Prompt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="e.g., Bar Chart - Population Growth"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Image (Chart/Graph/Map)</label>
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
                  {newImage && (
                    <div className="mt-2">
                      <img
                        src={`data:${newImageType};base64,${newImage}`}
                        alt="Preview"
                        className="max-h-48 rounded border"
                      />
                    </div>
                  )}
                </div>
                <Button onClick={handleAdd} className="w-full">
                  Add Prompt
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
                placeholder="Search prompts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No prompts found
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[150px]">Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.image_base64 ? (
                          <img
                            src={`data:${item.image_type};base64,${item.image_base64}`}
                            alt={item.title}
                            className="h-16 w-16 object-cover rounded"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItem?.id === item.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingItem.title}
                              onChange={(e) =>
                                setEditingItem({ ...editingItem, title: e.target.value })
                              }
                            />
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </div>
                        ) : (
                          <p>{item.title}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {editingItem?.id === item.id ? (
                            <>
                              <Button size="sm" onClick={handleUpdate}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingItem(null);
                                  setNewImage(null);
                                  setNewImageType(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingItem(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDelete(item.id)}
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
