import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useInstitution } from '@/contexts/InstitutionContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { JoinInstitutionModal } from '@/components/institution/JoinInstitutionModal';
import { 
  LogOut, FileText, Cloud, CloudOff, Wifi, WifiOff, Shield, 
  Building2, UserPlus, User, GraduationCap, BookOpen
} from 'lucide-react';

export function UserMenu() {
  const { user, profile, isOnline, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const { activeMembership, activeInstitution } = useInstitution();
  const navigate = useNavigate();
  
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
        Sign In
      </Button>
    );
  }

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge variant={isOnline ? 'default' : 'secondary'} className="gap-1">
          {isOnline ? (
            <>
              <Cloud className="h-3 w-3" />
              <span className="hidden sm:inline">Synced</span>
            </>
          ) : (
            <>
              <CloudOff className="h-3 w-3" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {profile?.display_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                {isAdmin && (
                  <Badge variant="default" className="w-fit mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    Platform Admin
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Institution Section */}
            {activeInstitution && activeMembership ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Current Institution
                </DropdownMenuLabel>
                <DropdownMenuItem disabled className="opacity-100">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="truncate">{activeInstitution.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs capitalize">
                    {activeMembership.role.replace('_', ' ')}
                  </Badge>
                </DropdownMenuItem>
                
                {activeMembership.role === 'inst_admin' && (
                  <DropdownMenuItem onClick={() => navigate('/institution/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Institution Admin
                  </DropdownMenuItem>
                )}
                {['teacher', 'inst_admin'].includes(activeMembership.role) && (
                  <DropdownMenuItem onClick={() => navigate('/institution/teacher')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Teacher Dashboard
                  </DropdownMenuItem>
                )}
                {activeMembership.role === 'student' && (
                  <DropdownMenuItem onClick={() => navigate('/institution/student')}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Student Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            ) : (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Institution: None
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setJoinModalOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Institution
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/drafts')}>
              <FileText className="mr-2 h-4 w-4" />
              My Drafts
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground" disabled>
              <span className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-500" />
                )}
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <JoinInstitutionModal open={joinModalOpen} onOpenChange={setJoinModalOpen} />
    </>
  );
}