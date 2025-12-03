import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LocalEssay } from '@/types/essay';
import { format } from 'date-fns';
import { FileText, Calendar, Award, MessageSquare, Share2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface EssayViewerProps {
  essay: LocalEssay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EssayViewer({ essay, open, onOpenChange }: EssayViewerProps) {
  const { user } = useAuth();
  const { activeInstitution, activeMembership } = useInstitution();
  const { toast } = useToast();
  const [isShared, setIsShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  const checkSharedStatus = async () => {
    if (!essay?.cloudId) return;
    
    try {
      const { data, error } = await supabase
        .from('essays')
        .select('shared_with_teacher')
        .eq('id', essay.cloudId)
        .single();
      
      if (!error && data) {
        setIsShared(data.shared_with_teacher || false);
      }
    } catch (err) {
      console.error('Error checking shared status:', err);
    }
  };

  // Check if essay is shared with teacher
  useEffect(() => {
    if (open && essay?.cloudId && user && activeInstitution) {
      checkSharedStatus();
    }
  }, [open, essay?.cloudId, user, activeInstitution]);

  if (!essay) return null;

  if (!essay) return null;

  const handleShareWithTeacher = async () => {
    if (!essay?.cloudId || !user || !activeInstitution || !activeMembership) {
      toast({
        title: 'Cannot share',
        description: 'Please save your essay to the cloud first.',
        variant: 'destructive',
      });
      return;
    }

    setSharing(true);
    try {
      const { error } = await supabase
        .from('essays')
        .update({ shared_with_teacher: true })
        .eq('id', essay.cloudId)
        .eq('user_id', user.id);

      if (error) throw error;

      setIsShared(true);
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
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!essay?.cloudId || !user) return;

    setSharing(true);
    try {
      const { error } = await supabase
        .from('essays')
        .update({ shared_with_teacher: false })
        .eq('id', essay.cloudId)
        .eq('user_id', user.id);

      if (error) throw error;

      setIsShared(false);
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
    } finally {
      setSharing(false);
    }
  };

  // Debug: Log essay data to help diagnose issues
  if (open && essay) {
    console.log('EssayViewer - Essay data:', {
      localId: essay.localId,
      cloudId: essay.cloudId,
      examType: essay.examType,
      topic: essay.topic,
      essayTextLength: essay.essayText?.length || 0,
      essayTextPreview: essay.essayText?.substring(0, 50) || 'empty',
      wordCount: essay.wordCount,
      hasEssayText: !!essay.essayText,
    });
  }

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

  // Fallback sequence: essayText -> empty message
  const displayText = essay.essayText || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Badge variant={getExamBadgeVariant(essay.examType)} className="w-fit">
              {getExamLabel(essay.examType)}
            </Badge>
            <DialogTitle className="flex-1 line-clamp-2 text-base sm:text-lg">
              {essay.topic || 'Untitled Essay'}
            </DialogTitle>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(essay.updatedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{essay.wordCount} words</span>
            </div>
            {essay.aiScore !== undefined && essay.aiScore !== null && (
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                <span>Score: {Number(essay.aiScore).toFixed(1)}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] sm:max-h-[65vh] pr-2 sm:pr-4">
          <div className="space-y-4">
            {/* Essay Content */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Essay Content
              </h3>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {displayText ? (
                  <p 
                    className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed font-serif break-words"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  >
                    {displayText}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic text-sm sm:text-base">
                    No content yet...
                  </p>
                )}
              </div>
            </div>

            {/* AI Feedback */}
            {essay.aiFeedback && (
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Feedback
                </h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 p-4 rounded-lg">
                    {essay.aiFeedback}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(essay.createdAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(essay.updatedAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Word Count:</span>{' '}
                  <span className="font-medium">{essay.wordCount} words</span>
                </div>
                {essay.aiScore !== undefined && essay.aiScore !== null && (
                  <div>
                    <span className="text-muted-foreground">AI Score:</span>{' '}
                    <span className="font-medium">{Number(essay.aiScore).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Share with Teacher Button */}
            {activeInstitution && activeMembership?.role === 'student' && essay.cloudId && (
              <div className="pt-4 border-t">
                {isShared ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Shared with your teacher</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnshare}
                      disabled={sharing}
                    >
                      Unshare
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleShareWithTeacher}
                    disabled={sharing}
                    className="w-full sm:w-auto"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {sharing ? 'Sharing...' : 'Share with Teacher'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

