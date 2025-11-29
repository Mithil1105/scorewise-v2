import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { useAdmin } from '@/hooks/useAdmin';
import { PageLayout } from '@/components/layout/PageLayout';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { JoinInstitutionModal } from '@/components/institution/JoinInstitutionModal';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Building2, UserPlus, Shield, 
  BookOpen, GraduationCap, Clock, Check, Lock, Eye, EyeOff
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading, updatePassword } = useAuth();
  const { isAdmin } = useAdmin();
  const { 
    memberships, 
    activeMembership, 
    activeInstitution,
    setActiveMembership,
    loading: instLoading 
  } = useInstitution();
  const { toast } = useToast();
  
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Open join modal if accessed via /join-institution route
  useEffect(() => {
    if (location.pathname === '/join-institution') {
      setJoinModalOpen(true);
    }
  }, [location.pathname]);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (authLoading || instLoading) {
    return (
      <PageLayout>
        <TopBar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email?.charAt(0).toUpperCase() || 'U';
  };

  const pendingMemberships = memberships.filter(m => m.status === 'pending');
  const activeMemberships = memberships.filter(m => m.status === 'active');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'inst_admin': return <Shield className="h-4 w-4" />;
      case 'teacher': return <BookOpen className="h-4 w-4" />;
      case 'student': return <GraduationCap className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <PageLayout>
      <TopBar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        {/* User Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle>{profile?.display_name || 'User'}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
                {isAdmin && (
                  <Badge variant="default" className="mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    Platform Admin
                  </Badge>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => setPasswordDialogOpen(true)}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Current Institution */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Current Institution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeInstitution && activeMembership ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{activeInstitution.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize flex items-center gap-1">
                        {getRoleIcon(activeMembership.role)}
                        {activeMembership.role.replace('_', ' ')}
                      </Badge>
                      <Badge variant="secondary">{activeInstitution.plan}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['inst_admin'].includes(activeMembership.role) && (
                      <Button onClick={() => navigate('/institution/admin')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Button>
                    )}
                    {['teacher', 'inst_admin'].includes(activeMembership.role) && (
                      <Button variant="outline" onClick={() => navigate('/institution/teacher')}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Teacher Dashboard
                      </Button>
                    )}
                    {activeMembership.role === 'student' && (
                      <Button onClick={() => navigate('/institution/student')}>
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Student Dashboard
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Not affiliated with any institution</p>
                <p className="text-sm">Join an institution using the code provided by your coaching center</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Affiliate with Institution */}
        {!activeInstitution && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
                Join an Institution
            </CardTitle>
            <CardDescription>
                Enter the institution code provided by your coaching center to access assignments and track your progress
            </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={() => setJoinModalOpen(true)} size="lg" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Enter Institution Code
              </Button>
                </div>
              {isAdmin && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    <Shield className="h-4 w-4 inline mr-1" />
                    As a platform admin, you can create institutions and assign users.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/admin/institutions')}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Manage Institutions
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Pending Requests */}
        {pendingMemberships.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Requests
              </CardTitle>
              <CardDescription>
                Waiting for approval from institution admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingMemberships.map((membership) => (
                  <div 
                    key={membership.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{membership.institution?.name}</p>
                      <Badge variant="secondary">Pending Approval</Badge>
                    </div>
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Memberships */}
        {activeMemberships.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>My Institutions</CardTitle>
              <CardDescription>
                Select which institution to use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeMemberships.map((membership) => (
                  <div 
                    key={membership.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      activeMembership?.id === membership.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveMembership(membership)}
                  >
                    <div>
                      <p className="font-medium">{membership.institution?.name}</p>
                      <Badge variant="outline" className="capitalize flex items-center gap-1 mt-1">
                        {getRoleIcon(membership.role)}
                        {membership.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    {activeMembership?.id === membership.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <JoinInstitutionModal open={joinModalOpen} onOpenChange={setJoinModalOpen} />

        {/* Change Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </DialogTitle>
              <DialogDescription>
                Enter your new password. Make sure it's at least 6 characters long.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-destructive">Password must be at least 6 characters</p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setCurrentPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newPassword || newPassword.length < 6) {
                    toast({
                      title: "Invalid password",
                      description: "Password must be at least 6 characters long.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast({
                      title: "Passwords don't match",
                      description: "Please make sure both passwords match.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setIsChangingPassword(true);
                  const { error } = await updatePassword(newPassword);
                  setIsChangingPassword(false);
                  if (error) {
                    toast({
                      title: "Failed to change password",
                      description: error.message || "Please try again later.",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Password changed!",
                      description: "Your password has been updated successfully.",
                    });
                    setPasswordDialogOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setCurrentPassword('');
                  }
                }}
                disabled={isChangingPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}