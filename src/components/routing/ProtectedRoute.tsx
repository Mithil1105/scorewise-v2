import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireInstitution?: boolean; // For institution routes, wait for institution context
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireInstitution = false
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { activeMembership, loading: institutionLoading } = useInstitution();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if this is an institution route
  const isInstitutionRoute = location.pathname.startsWith('/institution') || 
                             location.pathname.startsWith('/admin/institution');

  // If it's an institution route, we should wait for institution context
  const shouldWaitForInstitution = requireInstitution || isInstitutionRoute;

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // If auth is required and user is not authenticated, redirect
    if (requireAuth && !user) {
      navigate("/auth");
      return;
    }

    // For institution routes, wait for institution context to load
    // Don't redirect until we're sure about the state
    if (shouldWaitForInstitution && institutionLoading) {
      return; // Still loading institution context
    }
  }, [user, authLoading, institutionLoading, requireAuth, shouldWaitForInstitution, navigate]);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while institution context is loading (for institution routes)
  if (shouldWaitForInstitution && institutionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your institution...</p>
        </div>
      </div>
    );
  }

  // If auth is required and user is not authenticated, don't render
  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}

