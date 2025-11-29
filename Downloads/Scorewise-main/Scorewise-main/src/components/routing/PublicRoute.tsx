import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PublicRouteProps {
  children: ReactNode;
  redirectIfAuth?: string;
}

export default function PublicRoute({ 
  children, 
  redirectIfAuth 
}: PublicRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && redirectIfAuth) {
      navigate(redirectIfAuth);
    }
  }, [user, loading, redirectIfAuth, navigate]);

  return <>{children}</>;
}

