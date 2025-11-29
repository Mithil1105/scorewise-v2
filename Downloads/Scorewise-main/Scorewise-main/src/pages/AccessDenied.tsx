import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX, Home } from 'lucide-react';

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <ShieldX className="h-24 w-24 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">403</h1>
        <h2 className="text-2xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this page. This area is restricted to administrators only.
        </p>
        <Button onClick={() => navigate('/')} className="gap-2">
          <Home className="h-4 w-4" />
          Go to Home
        </Button>
      </div>
    </div>
  );
}
