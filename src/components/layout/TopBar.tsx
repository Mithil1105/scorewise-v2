import { useNavigate } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TopBarProps {
  title?: string;
  showDraftsButton?: boolean;
}

export function TopBar({ title = 'ScoreWise', showDraftsButton = true }: TopBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 
          className="text-lg font-bold cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate('/')}
        >
          {title}
        </h1>
        
        <div className="flex items-center gap-2">
          {showDraftsButton && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/drafts')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Drafts</span>
            </Button>
          )}
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
