import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { useLocalEssays, useLocalImages } from '@/hooks/useLocalStorage';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { getRemainingStorage, MAX_STORAGE_KB } from '@/utils/storageUsage';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileText, Trash2, Cloud, Lock, RefreshCw, ArrowLeft, Eye, Trash, CheckSquare, Square, Download, Share2, CheckCircle2 } from 'lucide-react';
import { LocalEssay } from '@/types/essay';
import { format } from 'date-fns';
import { EssayViewer } from '@/components/essay/EssayViewer';
import { useToast } from '@/hooks/use-toast';
import { exportEssayAsDocx } from '@/utils/exportEssay';
import { exportIELTSTask1AsDocx, exportIELTSTask2AsDocx } from '@/utils/exportIELTS';


export default function Drafts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { essays, saveEssays, deleteEssay } = useLocalEssays();
  const { deleteImagesForEssay } = useLocalImages();
  const { user, isOnline } = useAuth();
  const { activeInstitution, activeMembership } = useInstitution();
  const { 
    syncing, 
    syncEssays, 
    deleteCloudEssay, 
    deleteCloudEssays,
    lastSyncTime
  } = useCloudSync();
  const [sortedEssays, setSortedEssays] = useState<LocalEssay[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingEssay, setViewingEssay] = useState<LocalEssay | null>(null);
  const [selectedEssays, setSelectedEssays] = useState<Set<string>>(new Set());
  const [storageUsed, setStorageUsed] = useState(0); // in bytes
  const [deleting, setDeleting] = useState(false);
  const [sharedEssays, setSharedEssays] = useState<Set<string>>(new Set());

  // Fetch storage usage
  const fetchStorageUsage = async () => {
    if (user && isOnline) {
      const { used, usedMb } = await getRemainingStorage(supabase, user.id);
      console.log('Storage Used (KB):', used);
      console.log('Storage Used (MB):', usedMb.toFixed(2));
      setStorageUsed(used * 1024); // Convert KB to bytes for display
    } else {
      // Calculate local storage usage in KB
      const localUsageKb = essays.reduce((sum, e) => {
        return sum + Math.ceil(new Blob([e.essayText || '']).size / 1024);
      }, 0);
      setStorageUsed(localUsageKb * 1024); // Convert to bytes for display
    }
  };

  // Fetch shared status for essays
  const fetchSharedStatus = async () => {
    if (!user || !isOnline) return;
    
    try {
      const cloudIds = essays.filter(e => e.cloudId).map(e => e.cloudId!);
      if (cloudIds.length === 0) return;

      const { data, error } = await supabase
        .from('essays')
        .select('id, shared_with_teacher')
        .in('id', cloudIds)
        .eq('user_id', user.id);

      if (!error && data) {
        const sharedSet = new Set<string>();
        data.forEach(e => {
          if (e.shared_with_teacher) {
            sharedSet.add(e.id);
          }
        });
        setSharedEssays(sharedSet);
      }
    } catch (err) {
      console.error('Error fetching shared status:', err);
    }
  };

  // Fetch and sync essays on page load
  useEffect(() => {
    const loadEssays = async () => {
      if (user && isOnline) {
        setLoading(true);
        try {
          const syncedEssays = await syncEssays(essays, saveEssays);
          console.log('Synced essays:', syncedEssays.length, 'essays');
          if (syncedEssays.length > 0) {
            console.log('First synced essay sample:', {
              localId: syncedEssays[0].localId,
              essayTextLength: syncedEssays[0].essayText?.length || 0,
              essayTextPreview: syncedEssays[0].essayText?.substring(0, 50) || 'empty',
              wordCount: syncedEssays[0].wordCount,
            });
          }
          await fetchStorageUsage();
          await fetchSharedStatus();
        } catch (error) {
          console.error('Error syncing essays:', error);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('Offline or not logged in, showing local essays:', essays.length);
        await fetchStorageUsage();
        setLoading(false);
      }
    };

    loadEssays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isOnline]);

  // Update sorted essays whenever essays change
  useEffect(() => {
    const sorted = [...essays].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setSortedEssays(sorted);
    fetchStorageUsage();
    if (user && isOnline) {
      fetchSharedStatus();
    }
  }, [essays, user, isOnline]);

  const handleSync = async () => {
    if (user && isOnline) {
      await syncEssays(essays, saveEssays);
      await fetchStorageUsage();
    }
  };

  const handleContinue = (essay: LocalEssay) => {
    localStorage.setItem('scorewise_continue_essay', essay.localId);
    
    switch (essay.examType) {
      case 'GRE':
        navigate('/essay');
        break;
      case 'IELTS-Task1':
        navigate('/ielts/task1');
        break;
      case 'IELTS-Task2':
        navigate('/ielts/task2');
        break;
    }
  };

  const handleDownload = async (essay: LocalEssay) => {
    try {
      switch (essay.examType) {
        case 'GRE':
          await exportEssayAsDocx(
            essay.essayText,
            { id: 0, type: 'issue', topic: essay.topic, instructions: '' },
            essay.wordCount
          );
          break;
        case 'IELTS-Task1':
          await exportIELTSTask1AsDocx(
            essay.essayText,
            { id: 0, type: 'bar-chart', title: essay.topic, description: essay.topic, instructions: '' },
            essay.wordCount,
            false
          );
          break;
        case 'IELTS-Task2':
          await exportIELTSTask2AsDocx(
            essay.essayText,
            { id: 0, type: 'opinion', topic: essay.topic, instructions: '' },
            essay.wordCount
          );
          break;
      }
      toast({
        title: 'Essay downloaded!',
        description: 'Your essay has been downloaded as a .docx file.',
      });
    } catch (error) {
      console.error('Error downloading essay:', error);
      toast({
        title: 'Download failed',
        description: 'There was an error downloading your essay.',
        variant: 'destructive',
      });
    }
  };

  const handleShareWithTeacher = async (essay: LocalEssay) => {
    if (!essay.cloudId || !user || !isOnline) {
      toast({
        title: 'Cannot share',
        description: 'Please save your essay to the cloud first by submitting it.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('essays')
        .update({ shared_with_teacher: true })
        .eq('id', essay.cloudId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSharedEssays(prev => new Set([...prev, essay.cloudId!]));
      toast({
        title: 'Shared with teacher!',
        description: 'Your teacher can now view this essay.',
      });
    } catch (err: any) {
      console.error('Error sharing essay:', err);
      toast({
        title: 'Failed to share',
        description: err.message || 'Could not share essay with teacher.',
        variant: 'destructive',
      });
    }
  };

  const handleUnshare = async (essay: LocalEssay) => {
    if (!essay.cloudId || !user) return;

    try {
      const { error } = await supabase
        .from('essays')
        .update({ shared_with_teacher: false })
        .eq('id', essay.cloudId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSharedEssays(prev => {
        const newSet = new Set(prev);
        newSet.delete(essay.cloudId!);
        return newSet;
      });
      toast({
        title: 'Unshared',
        description: 'This essay is no longer visible to your teacher.',
      });
    } catch (err: any) {
      console.error('Error unsharing essay:', err);
      toast({
        title: 'Failed to unshare',
        description: err.message || 'Could not unshare essay.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (essay: LocalEssay) => {
    if (essay.cloudId && user && isOnline) {
      await deleteCloudEssay(essay.cloudId);
    }
    
    deleteImagesForEssay(essay.localId);
    deleteEssay(essay.localId);
    await fetchStorageUsage();
  };

  const handleDeleteSelected = async () => {
    if (selectedEssays.size === 0) return;

    setDeleting(true);
    try {
      const selectedArray = Array.from(selectedEssays);
      const essaysToDelete = sortedEssays.filter(e => selectedArray.includes(e.localId));
      
      // Delete from cloud
      const cloudIds = essaysToDelete
        .filter(e => e.cloudId && user && isOnline)
        .map(e => e.cloudId!);
      
      if (cloudIds.length > 0) {
        await deleteCloudEssays(cloudIds);
      }

      // Delete local images and essays
      essaysToDelete.forEach(essay => {
        deleteImagesForEssay(essay.localId);
        deleteEssay(essay.localId);
      });

      console.log('Deleted essays:', selectedEssays.size);
      setSelectedEssays(new Set());
      toast({
        title: 'Deleted',
        description: `${selectedEssays.size} ${selectedEssays.size === 1 ? 'essay' : 'essays'} deleted successfully.`,
      });
      await fetchStorageUsage();
    } catch (error) {
      console.error('Error deleting essays:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete essays. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setDeleting(true);
    try {
      // Delete all from cloud
      if (user && isOnline) {
        const cloudIds = sortedEssays
          .filter(e => e.cloudId)
          .map(e => e.cloudId!);
        
        if (cloudIds.length > 0) {
          await deleteCloudEssays(cloudIds);
        }
      }

      // Delete all local images and essays
      sortedEssays.forEach(essay => {
        deleteImagesForEssay(essay.localId);
        deleteEssay(essay.localId);
      });

      console.log('Cleared all essays:', sortedEssays.length);
      setSelectedEssays(new Set());
      toast({
        title: 'Cleared',
        description: 'All essays deleted successfully.',
      });
      await fetchStorageUsage();
    } catch (error) {
      console.error('Error clearing essays:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear essays. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (localId: string) => {
    const newSelected = new Set(selectedEssays);
    if (newSelected.has(localId)) {
      newSelected.delete(localId);
    } else {
      newSelected.add(localId);
    }
    setSelectedEssays(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedEssays.size === sortedEssays.length) {
      setSelectedEssays(new Set());
    } else {
      setSelectedEssays(new Set(sortedEssays.map(e => e.localId)));
    }
  };

  const getExamBadgeVariant = (examType: string) => {
    switch (examType) {
      case 'GRE':
        return 'default';
      case 'IELTS-Task1':
        return 'secondary';
      case 'IELTS-Task2':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getExamLabel = (examType: string) => {
    switch (examType) {
      case 'GRE':
        return 'GRE Essay';
      case 'IELTS-Task1':
        return 'IELTS Task 1';
      case 'IELTS-Task2':
        return 'IELTS Task 2';
      default:
        return examType;
    }
  };

  const storageUsedKb = storageUsed / 1024; // Convert bytes to KB
  const storageUsedMb = (storageUsedKb / 1024).toFixed(2);
  const storagePercent = Math.min((storageUsedKb / MAX_STORAGE_KB) * 100, 100);
  const isStorageFull = storageUsedKb >= MAX_STORAGE_KB;
  
  // Dynamic storage display: show KB if < 1MB, otherwise show MB
  const storageDisplay = storageUsedKb < 1024 
    ? `${Math.round(storageUsedKb)} KB / ${MAX_STORAGE_KB} KB`
    : `${storageUsedMb} MB / ${(MAX_STORAGE_KB / 1024).toFixed(2)} MB`;

  return (
    <PageLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Drafts</h1>
              <p className="text-sm text-muted-foreground">
                {essays.length} {essays.length === 1 ? 'draft' : 'drafts'} saved
              </p>
            </div>
          </div>
          
          {user && (
            <Button 
              variant="outline" 
              onClick={handleSync} 
              disabled={syncing || !isOnline}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}
        </div>

        {/* Storage Usage Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Storage Used</span>
                <span className={isStorageFull ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                  {storageDisplay}
                </span>
              </div>
              <Progress value={storagePercent} className="h-2" />
              {isStorageFull && (
                <p className="text-xs text-destructive">
                  Storage limit reached. Delete old drafts to continue saving.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {sortedEssays.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="w-full sm:w-auto"
            >
              {selectedEssays.size === sortedEssays.length ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Deselect All
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Select All
                </>
              )}
            </Button>
            {selectedEssays.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="w-full sm:w-auto"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Selected ({selectedEssays.size})
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Drafts?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {sortedEssays.length} {sortedEssays.length === 1 ? 'draft' : 'drafts'} from both your device and the cloud. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Clear All'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-500">Offline Mode: Local Save Active</span>
          </div>
        )}

        {lastSyncTime && user && (
          <p className="text-xs text-muted-foreground mb-4">
            Last synced: {format(lastSyncTime, 'MMM d, h:mm a')}
          </p>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Loading your essays...</span>
              </div>
            </CardContent>
          </Card>
        ) : sortedEssays.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No drafts yet</h3>
              <p className="text-muted-foreground mb-4">
                Start writing an essay and it will be saved here automatically.
              </p>
              <Button onClick={() => navigate('/')}>Start Writing</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedEssays.map((essay) => {
              const isSelected = selectedEssays.has(essay.localId);
              return (
                <Card 
                  key={essay.cloudId || essay.localId} 
                  className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(essay.localId)}
                          className="shrink-0"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant={getExamBadgeVariant(essay.examType)} className="shrink-0">
                            {getExamLabel(essay.examType)}
                          </Badge>
                          {essay.cloudId ? (
                            <span title="Synced to cloud" className="shrink-0">
                              <Cloud className="h-4 w-4 text-green-500" />
                            </span>
                          ) : (
                            <span title="Local only" className="shrink-0">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(essay.updatedAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base mb-2 line-clamp-2">
                      {essay.topic || 'Untitled Essay'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {essay.essayText || 'No content yet...'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{essay.wordCount} words</span>
                        {essay.aiScore !== undefined && essay.aiScore !== null && (
                          <Badge variant="secondary">Score: {Number(essay.aiScore).toFixed(1)}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const latestEssay = essays.find(e => e.localId === essay.localId) || essay;
                            console.log('Viewing essay:', {
                              localId: latestEssay.localId,
                              essayTextLength: latestEssay.essayText?.length || 0,
                              essayText: latestEssay.essayText?.substring(0, 100) || 'empty',
                              wordCount: latestEssay.wordCount,
                            });
                            setViewingEssay(latestEssay);
                          }}
                          className="flex-1 sm:flex-initial"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownload(essay)}
                          className="flex-1 sm:flex-initial"
                          disabled={!essay.essayText || essay.essayText.trim().length === 0}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        {activeInstitution && activeMembership?.role === 'student' && essay.cloudId && (
                          sharedEssays.has(essay.cloudId) ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUnshare(essay)}
                              className="flex-1 sm:flex-initial"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                              Shared
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => handleShareWithTeacher(essay)}
                              className="flex-1 sm:flex-initial"
                            >
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                          )
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => handleContinue(essay)}
                          className="flex-1 sm:flex-initial"
                        >
                          Continue
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="shrink-0">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this essay{essay.cloudId ? ' from both your device and the cloud' : ''}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(essay)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          Synced locally & in cloud — Built by Mithil & Hasti
        </footer>
      </div>

      {/* Essay Viewer Dialog */}
      <EssayViewer 
        essay={viewingEssay}
        open={!!viewingEssay}
        onOpenChange={(open) => !open && setViewingEssay(null)}
      />
    </PageLayout>
  );
}
