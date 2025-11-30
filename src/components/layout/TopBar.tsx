import { useNavigate, Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Button } from '@/components/ui/button';
import { FileText, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TopBarProps {
  title?: string;
  showDraftsButton?: boolean;
  showBackButton?: boolean;
  showContactButton?: boolean;
}

export function TopBar({ 
  title = 'ScoreWise', 
  showDraftsButton = true,
  showBackButton = false,
  showContactButton = true
}: TopBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <span className="text-lg">←</span>
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          <h1 
            className="text-lg font-bold cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate(user ? '/dashboard' : '/')}
          >
            {title}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {showContactButton && (
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="gap-2"
            >
              <Link to="/contact">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Contact</span>
              </Link>
            </Button>
          )}
          {showDraftsButton && user && (
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
