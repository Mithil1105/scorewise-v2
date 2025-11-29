import { Check, Loader2, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SaveStatusProps {
  status: 'saved' | 'saving' | 'idle';
  isSynced?: boolean;
}

export function SaveStatus({ status, isSynced }: SaveStatusProps) {
  const { isOnline, user } = useAuth();

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span>Saved</span>
        </>
      )}
      {status === 'idle' && user && (
        <>
          {isOnline ? (
            isSynced ? (
              <>
                <Cloud className="h-3 w-3 text-green-500" />
                <span>Synced</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3 text-amber-500" />
                <span>Local only</span>
              </>
            )
          ) : (
            <>
              <CloudOff className="h-3 w-3 text-amber-500" />
              <span>Offline</span>
            </>
          )}
        </>
      )}
    </div>
  );
}
