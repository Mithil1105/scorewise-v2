import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

interface SubmitSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitSuccessDialog({ open, onOpenChange }: SubmitSuccessDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 max-w-sm mx-auto text-center space-y-4 sm:p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-semibold">Essay Saved Successfully 🎉</h2>
        
        <p className="text-sm text-muted-foreground">
          Great job! Your essay has been safely stored in the cloud.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Button 
            onClick={() => {
              onOpenChange(false);
              navigate('/drafts');
            }}
            className="w-full"
          >
            My Drafts
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              navigate('/dashboard');
            }}
            className="w-full"
          >
            Dashboard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          You can continue later or review with your teacher
        </p>
      </DialogContent>
    </Dialog>
  );
}

