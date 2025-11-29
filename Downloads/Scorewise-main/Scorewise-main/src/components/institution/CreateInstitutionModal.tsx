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
import { Building2, Loader2 } from 'lucide-react';

interface CreateInstitutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInstitutionModal({ open, onOpenChange }: CreateInstitutionModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { createInstitution, setActiveMembership, memberships } = useInstitution();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const { institution, error } = await createInstitution(name.trim());
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
      return;
    }

    if (institution) {
      toast({
        title: 'Institution Created!',
        description: `Your institution code is: ${institution.code}`,
      });
      
      // Set as active after memberships refresh
      setTimeout(() => {
        const newMembership = memberships.find(m => m.institution_id === institution.id);
        if (newMembership) {
          setActiveMembership(newMembership);
        }
      }, 500);
      
      setName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Institution
          </DialogTitle>
          <DialogDescription>
            Create your coaching institution on ScoreWise. You'll receive a unique code to share with your students and teachers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Institution Name</Label>
              <Input
                id="name"
                placeholder="e.g., Elite GRE Academy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Institution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
