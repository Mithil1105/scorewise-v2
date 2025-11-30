import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocalEssay } from '@/types/essay';
import { format } from 'date-fns';
import { FileText, Calendar, Award, MessageSquare } from 'lucide-react';

interface EssayViewerProps {
  essay: LocalEssay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EssayViewer({ essay, open, onOpenChange }: EssayViewerProps) {
  if (!essay) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge variant={getExamBadgeVariant(essay.examType)}>
              {getExamLabel(essay.examType)}
            </Badge>
            <DialogTitle className="flex-1 line-clamp-2">
              {essay.topic || 'Untitled Essay'}
            </DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(essay.updatedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              <span>{essay.wordCount} words</span>
            </div>
            {essay.aiScore !== undefined && essay.aiScore !== null && (
              <div className="flex items-center gap-1 text-xs">
                <Award className="h-3 w-3" />
                <span>Score: {Number(essay.aiScore).toFixed(1)}</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Essay Content */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Essay Content
              </h3>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap text-base leading-relaxed font-serif">
                  {essay.essayText || (
                    <span className="text-muted-foreground italic">No content yet...</span>
                  )}
                </p>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

