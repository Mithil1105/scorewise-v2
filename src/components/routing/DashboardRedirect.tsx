import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeMembership, loading: instLoading } = useInstitution();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    // Wait for all loading states to complete before checking
    if (authLoading || instLoading || adminLoading) {
      return;
    }

    // If not authenticated, redirect to home
    if (!user) {
      navigate("/");
      return;
    }

    // Priority 1: Master Admin (platform admin)
    if (isAdmin) {
      navigate("/admin");
      return;
    }

    // Priority 2: Institution members with active membership
    if (activeMembership && activeMembership.status === 'active') {
      switch (activeMembership.role) {
        case "inst_admin":
          navigate("/institution/admin");
          return;
        case "teacher":
          navigate("/institution/teacher");
          return;
        case "student":
          navigate("/institution/student");
          return;
        default:
          // Unknown role, go to home
          navigate("/");
          return;
      }
    }

    // Priority 3: General student (no institution membership)
    // Stay on home page - no dashboard needed
    navigate("/");
  }, [user, activeMembership, isAdmin, authLoading, instLoading, adminLoading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

