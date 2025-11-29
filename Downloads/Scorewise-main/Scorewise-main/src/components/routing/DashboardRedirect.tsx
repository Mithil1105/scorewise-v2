import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { activeMembership, loading: instLoading } = useInstitution();

  useEffect(() => {
    // Wait for both auth and institution context to finish loading
    if (authLoading || instLoading) {
      return;
    }

    if (!user) {
      navigate("/");
      return;
    }

    // If user has institution membership, redirect based on role
    if (activeMembership && activeMembership.status === 'active') {
      switch (activeMembership.role) {
        case "student":
          navigate("/student/dashboard");
          break;
        case "teacher":
          navigate("/teacher/dashboard");
          break;
        case "inst_admin":
          navigate("/admin/institution");
          break;
        default:
          navigate("/student/dashboard");
      }
    } else {
      // No institution membership or inactive - show general student-like dashboard
      navigate("/student/dashboard");
    }
  }, [user, activeMembership, authLoading, instLoading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

