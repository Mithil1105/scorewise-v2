import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      // Wait for auth to finish loading before checking admin status
      if (authLoading) {
        return;
      }

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error('Error:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  // Loading is true if either auth is loading or admin check is loading
  const isLoading = authLoading || loading;

  return { isAdmin, loading: isLoading };
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetId?: string,
  details?: Json
) {
  try {
    await supabase.from('admin_audit').insert([{
      admin_id: adminId,
      action,
      target_id: targetId,
      details: details ?? null,
    }]);
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
}
