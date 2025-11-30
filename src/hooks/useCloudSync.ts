import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LocalEssay, LocalImage, CloudEssay } from '@/types/essay';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';

export function useCloudSync() {
  const { user, isOnline } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const fetchCloudEssays = useCallback(async (): Promise<CloudEssay[]> => {
    if (!user || !isOnline) return [];

    const { data, error } = await supabase
      .from('essays')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching cloud essays:', error);
      return [];
    }

    return data || [];
  }, [user, isOnline]);

  const uploadEssay = useCallback(async (essay: LocalEssay): Promise<string | null> => {
    if (!user || !isOnline) return null;

    const { data, error } = await supabase
      .from('essays')
      .insert({
        user_id: user.id,
        exam_type: essay.examType,
        topic: essay.topic,
        essay_text: essay.essayText,
        word_count: essay.wordCount,
        ai_score: essay.aiScore,
        ai_feedback: essay.aiFeedback,
        local_id: essay.localId,
        created_at: essay.createdAt,
        updated_at: essay.updatedAt,
        institution_id: activeMembership?.status === 'active' ? activeInstitution?.id : null,
        institution_member_id: activeMembership?.status === 'active' ? activeMembership?.id : null
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error uploading essay:', error);
      return null;
    }

    return data?.id || null;
  }, [user, isOnline, activeMembership, activeInstitution]);

  const updateCloudEssay = useCallback(async (cloudId: string, essay: LocalEssay): Promise<boolean> => {
    if (!user || !isOnline) return false;

    const { error } = await supabase
      .from('essays')
      .update({
        topic: essay.topic,
        essay_text: essay.essayText,
        word_count: essay.wordCount,
        ai_score: essay.aiScore,
        ai_feedback: essay.aiFeedback,
        updated_at: essay.updatedAt
      })
      .eq('id', cloudId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating cloud essay:', error);
      return false;
    }

    return true;
  }, [user, isOnline]);

  const deleteCloudEssay = useCallback(async (cloudId: string): Promise<boolean> => {
    if (!user || !isOnline) return false;

    const { error } = await supabase
      .from('essays')
      .delete()
      .eq('id', cloudId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting cloud essay:', error);
      return false;
    }

    return true;
  }, [user, isOnline]);

  const syncEssays = useCallback(async (
    localEssays: LocalEssay[],
    saveLocalEssays: (essays: LocalEssay[]) => void
  ): Promise<LocalEssay[]> => {
    if (!user || !isOnline) return localEssays;

    setSyncing(true);

    try {
      const cloudEssays = await fetchCloudEssays();
      const mergedEssays: LocalEssay[] = [];
      const cloudEssayMap = new Map(cloudEssays.map(e => [e.local_id, e]));
      const processedCloudIds = new Set<string>();

      // Process local essays
      for (const local of localEssays) {
        const cloud = cloudEssayMap.get(local.localId);
        
        if (cloud) {
          processedCloudIds.add(cloud.id);
          const localDate = new Date(local.updatedAt);
          const cloudDate = new Date(cloud.updated_at);

          if (localDate > cloudDate) {
            // Local is newer, update cloud
            await updateCloudEssay(cloud.id, local);
            mergedEssays.push({
              ...local,
              cloudId: cloud.id,
              syncedAt: new Date().toISOString()
            });
          } else if (cloudDate > localDate) {
            // Cloud is newer, update local
            mergedEssays.push({
              localId: local.localId,
              examType: cloud.exam_type as LocalEssay['examType'],
              topic: cloud.topic || '',
              essayText: cloud.essay_text || '',
              createdAt: cloud.created_at,
              updatedAt: cloud.updated_at,
              wordCount: cloud.word_count || 0,
              aiScore: cloud.ai_score || undefined,
              aiFeedback: cloud.ai_feedback || undefined,
              cloudId: cloud.id,
              syncedAt: new Date().toISOString()
            });
          } else {
            // Same, just mark as synced
            mergedEssays.push({
              ...local,
              cloudId: cloud.id,
              syncedAt: new Date().toISOString()
            });
          }
        } else {
          // Local only, upload to cloud
          const cloudId = await uploadEssay(local);
          mergedEssays.push({
            ...local,
            cloudId: cloudId || undefined,
            syncedAt: cloudId ? new Date().toISOString() : undefined
          });
        }
      }

      // Add cloud-only essays to local (essays that exist in cloud but not in local)
      for (const cloud of cloudEssays) {
        if (!processedCloudIds.has(cloud.id)) {
          // Check if this cloud essay is already in local by cloudId
          const alreadyInLocal = localEssays.find(l => l.cloudId === cloud.id);
          if (!alreadyInLocal) {
            // Generate a local_id if it doesn't exist
            const localId = cloud.local_id || crypto.randomUUID();
            mergedEssays.push({
              localId,
              examType: cloud.exam_type as LocalEssay['examType'],
              topic: cloud.topic || '',
              essayText: cloud.essay_text || '',
              createdAt: cloud.created_at,
              updatedAt: cloud.updated_at,
              wordCount: cloud.word_count || 0,
              aiScore: cloud.ai_score || undefined,
              aiFeedback: cloud.ai_feedback || undefined,
              cloudId: cloud.id,
              syncedAt: new Date().toISOString()
            });
          }
        }
      }

      saveLocalEssays(mergedEssays);
      setLastSyncTime(new Date());
      return mergedEssays;
    } catch (error) {
      console.error('Sync error:', error);
      return localEssays;
    } finally {
      setSyncing(false);
    }
  }, [user, isOnline, fetchCloudEssays, uploadEssay, updateCloudEssay]);

  return {
    syncing,
    lastSyncTime,
    syncEssays,
    uploadEssay,
    updateCloudEssay,
    deleteCloudEssay,
    fetchCloudEssays
  };
}
