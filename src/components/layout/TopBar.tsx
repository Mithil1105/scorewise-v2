import { useNavigate, Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Button } from '@/components/ui/button';
import { FileText, Mail, Sun, Moon, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';

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
  const { activeInstitution } = useInstitution();
  const { theme, cycleTheme } = useTheme();

  // Use institution branding if available, otherwise use default
  const displayTitle = activeInstitution 
    ? `${activeInstitution.name} • Powered by ScoreWise`
    : title;
  const logoUrl = activeInstitution?.logo_url;
  const themeColor = activeInstitution?.theme_color || undefined;

  // Get theme icon
  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'vibrant':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

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
          {activeInstitution && logoUrl && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={logoUrl} alt={activeInstitution.name} />
              <AvatarFallback style={{ backgroundColor: themeColor, color: 'white' }}>
                {activeInstitution.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
          <h1 
            className="text-lg font-bold cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
            onClick={() => navigate(user ? '/dashboard' : '/')}
            style={themeColor ? { color: themeColor } : undefined}
          >
            {displayTitle}
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
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleTheme}
            className="gap-2"
            title={`Current theme: ${theme}. Click to cycle themes.`}
          >
            {getThemeIcon()}
            <span className="hidden sm:inline capitalize">{theme}</span>
          </Button>
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
