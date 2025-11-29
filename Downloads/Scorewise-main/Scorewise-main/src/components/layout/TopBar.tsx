import { useNavigate, Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Button } from '@/components/ui/button';
import { FileText, LayoutDashboard, ClipboardList, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';

interface TopBarProps {
  title?: string;
  showDraftsButton?: boolean;
}

export function TopBar({ title = 'ScoreWise', showDraftsButton = true }: TopBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeMembership } = useInstitution();

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 
          className="text-lg font-bold cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(user ? '/dashboard' : '/')}
        >
          {title}
        </h1>
        
        <div className="flex items-center gap-2">
          {user && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="gap-2 hidden sm:flex"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              
              {activeMembership?.role === 'teacher' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="gap-2 hidden sm:flex"
                >
                  <Link to="/teacher/dashboard">
                    <ClipboardList className="h-4 w-4" />
                    Assignments
                  </Link>
                </Button>
              )}
              
              {activeMembership?.role === 'inst_admin' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="gap-2 hidden sm:flex"
                >
                  <Link to="/admin/institution">
                    <Shield className="h-4 w-4" />
                    Institution Admin
                  </Link>
                </Button>
              )}
              
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
            </>
          )}
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
