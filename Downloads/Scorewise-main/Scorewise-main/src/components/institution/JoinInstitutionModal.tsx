import { useState } from 'react';
import { useInstitution } from '@/contexts/InstitutionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';

interface JoinInstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinInstitutionModal({ open, onOpenChange }: JoinInstitutionModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { joinInstitution } = useInstitution();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    const { success, error } = await joinInstitution(code.trim());
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
      return;
    }

    if (success) {
      toast({
        title: 'Request Sent!',
        description: 'Your request has been sent to the institution admin for approval.',
      });
      setCode('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join Institution
          </DialogTitle>
          <DialogDescription>
            Enter the institution code provided by your coaching center to request membership.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Institution Code</Label>
              <Input
                id="code"
                placeholder="e.g., SW-ABCD-1234"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!code.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request to Join
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
