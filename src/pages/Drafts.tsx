import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { useLocalEssays, useLocalImages } from '@/hooks/useLocalStorage';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { FileText, Trash2, Cloud, Lock, RefreshCw, ArrowLeft } from 'lucide-react';
import { LocalEssay } from '@/types/essay';
import { format } from 'date-fns';

export default function Drafts() {
  const navigate = useNavigate();
  const { essays, saveEssays, deleteEssay } = useLocalEssays();
  const { deleteImagesForEssay } = useLocalImages();
  const { user, isOnline } = useAuth();
  const { syncing, syncEssays, deleteCloudEssay, lastSyncTime } = useCloudSync();
  const [sortedEssays, setSortedEssays] = useState<LocalEssay[]>([]);

  useEffect(() => {
    const sorted = [...essays].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setSortedEssays(sorted);
  }, [essays]);

  useEffect(() => {
    if (user && isOnline) {
      syncEssays(essays, saveEssays);
    }
  }, [user, isOnline]);

  const handleSync = async () => {
    if (user && isOnline) {
      await syncEssays(essays, saveEssays);
    }
  };

  const handleContinue = (essay: LocalEssay) => {
    // Store the essay ID to load
    localStorage.setItem('scorewise_continue_essay', essay.localId);
    
    // Navigate to appropriate page
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

  const handleDelete = async (essay: LocalEssay) => {
    // Delete from cloud if synced
    if (essay.cloudId && user && isOnline) {
      await deleteCloudEssay(essay.cloudId);
    }
    
    // Delete local images
    deleteImagesForEssay(essay.localId);
    
    // Delete local essay
    deleteEssay(essay.localId);
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

  return (
    <PageLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
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
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}
        </div>

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

        {sortedEssays.length === 0 ? (
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
            {sortedEssays.map((essay) => (
              <Card key={essay.localId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getExamBadgeVariant(essay.examType)}>
                        {getExamLabel(essay.examType)}
                      </Badge>
                      {essay.cloudId ? (
                        <span title="Synced to cloud">
                          <Cloud className="h-4 w-4 text-green-500" />
                        </span>
                      ) : (
                        <span title="Local only">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{essay.wordCount} words</span>
                      {essay.aiScore !== undefined && essay.aiScore !== null && (
                        <Badge variant="secondary">Score: {Number(essay.aiScore).toFixed(1)}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleContinue(essay)}
                      >
                        Continue
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
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
            ))}
          </div>
        )}

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          Synced locally & in cloud — Built by Mithil & Hasti
        </footer>
      </div>
    </PageLayout>
  );
}
