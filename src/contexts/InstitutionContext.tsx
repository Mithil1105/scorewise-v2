import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Institution {
  id: string;
  name: string;
  code: string;
  owner_user_id: string;
  logo_url: string | null;
  theme_color: string | null;
  plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstitutionMember {
  id: string;
  institution_id: string;
  user_id: string;
  role: 'student' | 'teacher' | 'inst_admin';
  status: 'active' | 'pending' | 'blocked';
  created_at: string;
  institution?: Institution;
}

interface InstitutionContextType {
  memberships: InstitutionMember[];
  activeMembership: InstitutionMember | null;
  activeInstitution: Institution | null;
  loading: boolean;
  setActiveMembership: (membership: InstitutionMember | null) => void;
  refreshMemberships: () => Promise<void>;
  createInstitution: (name: string, logoUrl?: string) => Promise<{ institution: Institution | null; error: string | null }>;
  joinInstitution: (code: string) => Promise<{ success: boolean; error: string | null }>;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

function generateInstitutionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SW-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<InstitutionMember[]>([]);
  const [activeMembership, setActiveMembershipState] = useState<InstitutionMember | null>(null);
  const [activeInstitution, setActiveInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = async () => {
    // Wait for auth to finish loading before proceeding
    if (authLoading) {
      return; // Auth is still loading, don't fetch yet
    }

    if (!user) {
      setMemberships([]);
      setActiveMembershipState(null);
      setActiveInstitution(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('institution_members')
        .select(`
          *,
          institution:institutions(id, name, code, owner_user_id, logo_url, theme_color, plan, is_active, created_at, updated_at)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const membershipData = (data || []).map((m: any) => ({
        ...m,
        institution: m.institution
      })) as InstitutionMember[];

      setMemberships(membershipData);

      // Restore active membership from localStorage
      const storedMembershipId = localStorage.getItem('activeInstitutionMembershipId');
      let activeMembershipSet = false;
      
      if (storedMembershipId) {
        const stored = membershipData.find(m => m.id === storedMembershipId && m.status === 'active');
        if (stored) {
          setActiveMembershipState(stored);
          // Always update activeInstitution with fresh data from the database
          setActiveInstitution(stored.institution || null);
          activeMembershipSet = true;
        } else {
          // Stored membership no longer exists or is inactive, clear it
          localStorage.removeItem('activeInstitutionMembershipId');
        }
      }
      
      // If no active membership is set, auto-select the first active membership
      if (!activeMembershipSet && membershipData.length > 0) {
        const firstActive = membershipData.find(m => m.status === 'active');
        if (firstActive) {
          setActiveMembershipState(firstActive);
          setActiveInstitution(firstActive.institution || null);
          localStorage.setItem('activeInstitutionMembershipId', firstActive.id);
        }
      } else if (membershipData.length === 0) {
        // No memberships, clear active
        setActiveMembershipState(null);
        setActiveInstitution(null);
        localStorage.removeItem('activeInstitutionMembershipId');
      }
      
      // If we already have an active membership, refresh its institution data
      // This ensures branding updates are reflected immediately
      if (activeMembershipSet && storedMembershipId) {
        const currentActive = membershipData.find(m => m.id === storedMembershipId && m.status === 'active');
        if (currentActive && currentActive.institution) {
          setActiveInstitution(currentActive.institution);
        }
      }
    } catch (err) {
      console.error('Error fetching memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [user, authLoading]);

  const setActiveMembership = (membership: InstitutionMember | null) => {
    setActiveMembershipState(membership);
    if (membership) {
      localStorage.setItem('activeInstitutionMembershipId', membership.id);
      setActiveInstitution(membership.institution || null);
    } else {
      localStorage.removeItem('activeInstitutionMembershipId');
      setActiveInstitution(null);
    }
  };

  const createInstitution = async (name: string, logoUrl?: string) => {
    if (!user) return { institution: null, error: 'Not authenticated' };

    // Check if user is a platform admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return { institution: null, error: 'Only platform admins can create institutions' };
    }

    try {
      const code = generateInstitutionCode();
      
      const { data: institution, error: instError } = await supabase
        .from('institutions')
        .insert({
          name,
          code,
          owner_user_id: user.id,
          logo_url: logoUrl || null
        })
        .select()
        .single();

      if (instError) throw instError;

      // Create membership as inst_admin
      const { error: memberError } = await supabase
        .from('institution_members')
        .insert({
          institution_id: institution.id,
          user_id: user.id,
          role: 'inst_admin',
          status: 'active'
        });

      if (memberError) throw memberError;

      await fetchMemberships();
      return { institution, error: null };
    } catch (err: any) {
      return { institution: null, error: err.message };
    }
  };

  const joinInstitution = async (code: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // Find institution by code
      const { data: institution, error: findError } = await supabase
        .from('institutions')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (findError) throw findError;
      if (!institution) return { success: false, error: 'Institution not found or inactive' };

      // Check if already a member
      const existing = memberships.find(m => m.institution_id === institution.id);
      if (existing) {
        return { success: false, error: `Already ${existing.status === 'pending' ? 'requested to join' : 'a member of'} this institution` };
      }

      // Create pending membership
      const { error: joinError } = await supabase
        .from('institution_members')
        .insert({
          institution_id: institution.id,
          user_id: user.id,
          role: 'student',
          status: 'pending'
        });

      if (joinError) throw joinError;

      await fetchMemberships();
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <InstitutionContext.Provider
      value={{
        memberships,
        activeMembership,
        activeInstitution,
        loading,
        setActiveMembership,
        refreshMemberships: fetchMemberships,
        createInstitution,
        joinInstitution
      }}
    >
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  const context = useContext(InstitutionContext);
  if (context === undefined) {
    throw new Error('useInstitution must be used within an InstitutionProvider');
  }
  return context;
}