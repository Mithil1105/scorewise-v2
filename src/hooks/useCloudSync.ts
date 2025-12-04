import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LocalEssay, LocalImage, CloudEssay } from '@/types/essay';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { useToast } from '@/hooks/use-toast';

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB in bytes

export function useCloudSync() {
  const { user, isOnline } = useAuth();
  const { activeMembership, activeInstitution } = useInstitution();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const fetchCloudEssays = useCallback(async (): Promise<CloudEssay[]> => {
    if (!user || !isOnline) return [];

    // Always fetch essay_text and all required fields
    const { data, error } = await supabase
      .from('essays')
      .select('id, user_id, exam_type, topic, essay_text, created_at, updated_at, word_count, ai_score, ai_feedback, local_id, institution_id, institution_member_id, task1_image_url, content_size')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching cloud essays:', error);
      return [];
    }

    console.log('Cloud essays fetched:', data?.length || 0, 'essays');
    return data || [];
  }, [user, isOnline]);

  const getUserStorageUsage = useCallback(async (): Promise<number> => {
    if (!user || !isOnline) return 0;

    try {
      const { data, error } = await supabase.rpc('get_user_storage_usage', {
        uid: user.id
      });

      if (error) {
        console.error('Error getting storage usage:', error);
        // Fallback: calculate manually
        const { data: essays } = await supabase
          .from('essays')
          .select('content_size')
          .eq('user_id', user.id);
        
        return essays?.reduce((sum, e) => sum + (e.content_size || 0), 0) || 0;
      }

      return data || 0;
    } catch (err) {
      console.error('Error calculating storage usage:', err);
      return 0;
    }
  }, [user, isOnline]);

  const uploadEssay = useCallback(async (essay: LocalEssay, isFirstSubmit: boolean = false): Promise<string | null> => {
    if (!user || !isOnline) {
      console.error('Cannot upload essay: user or online status missing');
      return null;
    }

    // NEVER upload Task 1 images - only text content
    if (essay.examType === 'IELTS-Task1') {
      console.log('Skipping Task 1 image upload - only syncing text content');
    }

    // Validate essay text is not empty
    if (!essay.essayText || !essay.essayText.trim()) {
      console.error('Cannot upload empty essay');
      return null;
    }

    // Calculate essay text size in bytes
    const essayTextSize = new Blob([essay.essayText || '']).size;

    // Check storage limit before upload
    const currentUsage = await getUserStorageUsage();
    const newUsage = currentUsage + essayTextSize;

    if (newUsage > STORAGE_LIMIT_BYTES) {
      const usedMb = (currentUsage / (1024 * 1024)).toFixed(2);
      const limitMb = (STORAGE_LIMIT_BYTES / (1024 * 1024)).toFixed(0);
      console.error('Storage limit reached:', usedMb, 'MB /', limitMb, 'MB');
      
      toast({
        title: 'Storage limit reached',
        description: `You've used ${usedMb} MB of ${limitMb} MB. Delete old drafts to continue.`,
        variant: 'destructive',
      });
      return null;
    }

    // Calculate storage size in KB
    const storageSizeKb = Math.ceil(essayTextSize / 1024);

    console.log('Cloud Upload Payload:', {
      examType: essay.examType,
      topic: essay.topic,
      essayTextLength: essay.essayText?.length || 0,
      wordCount: essay.wordCount,
      storageSizeKb,
      isFirstSubmit,
    });

    // Prepare insert data
    // Cloud sync ONLY updates essay_text - AI fields are updated separately via AI scoring button
    const insertData: any = {
      user_id: user.id,
      exam_type: essay.examType,
      topic: essay.topic,
      essay_text: essay.essayText, // Always include essay_text
      word_count: essay.wordCount,
      ai_score: null, // AI scoring is optional - always null on cloud sync
      ai_feedback: null, // AI scoring is optional - always null on cloud sync
      ielts_subscores: null, // AI scoring is optional - always null on cloud sync
      local_id: essay.localId,
      created_at: essay.createdAt,
      updated_at: essay.updatedAt,
      storage_size_kb: storageSizeKb, // Set storage size (trigger will also calculate)
      institution_id: activeMembership?.status === 'active' ? activeInstitution?.id : null,
      institution_member_id: activeMembership?.status === 'active' ? activeMembership?.id : null,
    };

    // Only set original_essay_text on first submit (when it doesn't exist yet)
    if (isFirstSubmit && essay.essayText) {
      insertData.original_essay_text = essay.essayText;
      console.log('Setting original_essay_text on first submit');
    }

    // Insert and return just the ID to avoid RLS issues
    const { data, error } = await supabase
      .from('essays')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error uploading essay:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: 'Upload failed',
        description: `Failed to save essay: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      return null;
    }

    console.log('Draft saved to cloud:', {
      id: data.id,
      essayTextLength: essay.essayText?.length || 0,
      wordCount: essay.wordCount,
    });
    return data?.id || null;
  }, [user, isOnline, activeMembership, activeInstitution, getUserStorageUsage, toast]);

  const updateCloudEssay = useCallback(async (cloudId: string, essay: LocalEssay): Promise<boolean> => {
    if (!user || !isOnline) {
      console.error('Cannot update essay: user or online status missing');
      return false;
    }

    // Validate essay text is not empty
    if (!essay.essayText || !essay.essayText.trim()) {
      console.error('Cannot update with empty essay');
      return false;
    }

    // Calculate new size
    const essayTextSize = new Blob([essay.essayText || '']).size;
    
    // Get current essay to calculate size difference and check if original_essay_text exists
    const { data: currentEssay } = await supabase
      .from('essays')
      .select('content_size, original_essay_text')
      .eq('id', cloudId)
      .single();

    const currentSize = currentEssay?.content_size || 0;
    const sizeDifference = essayTextSize - currentSize;

    // Check storage limit
    if (sizeDifference > 0) {
      const currentUsage = await getUserStorageUsage();
      const newUsage = currentUsage + sizeDifference;

      if (newUsage > STORAGE_LIMIT_BYTES) {
        const usedMb = (currentUsage / (1024 * 1024)).toFixed(2);
        const limitMb = (STORAGE_LIMIT_BYTES / (1024 * 1024)).toFixed(0);
        
        console.error('Storage limit reached on update');
        toast({
          title: 'Storage limit reached',
          description: `You've used ${usedMb} MB of ${limitMb} MB. Delete old drafts to continue.`,
          variant: 'destructive',
        });
        return false;
      }
    }

    console.log('Cloud Sync Payload (Update):', {
      examType: essay.examType,
      essayTextLength: essay.essayText?.length || 0,
      wordCount: essay.wordCount,
      hasOriginalText: !!currentEssay?.original_essay_text,
    });

    // Update data - never overwrite original_essay_text if it already exists
    // Cloud sync ONLY updates essay_text - AI fields are updated separately via AI scoring button
    const updateData: any = {
      topic: essay.topic,
      essay_text: essay.essayText, // Always include essay_text
      word_count: essay.wordCount,
      updated_at: essay.updatedAt
      // Do NOT update ai_score, ai_feedback, ielts_subscores - those are updated separately via AI scoring
      // content_size will be auto-calculated by trigger
      // original_essay_text is never updated - it's set once on first submit
    };

    // Only set original_essay_text if it doesn't exist yet (first update after creation)
    if (!currentEssay?.original_essay_text && essay.essayText) {
      updateData.original_essay_text = essay.essayText;
      console.log('Setting original_essay_text on first update');
    }

    const { error } = await supabase
      .from('essays')
      .update(updateData)
      .eq('id', cloudId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating cloud essay:', error);
      return false;
    }

    return true;
  }, [user, isOnline, getUserStorageUsage, toast]);

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

    console.log('Deleted essay from cloud:', cloudId);
    return true;
  }, [user, isOnline]);

  const deleteCloudEssays = useCallback(async (cloudIds: string[]): Promise<boolean> => {
    if (!user || !isOnline || cloudIds.length === 0) return false;

    const { error } = await supabase
      .from('essays')
      .delete()
      .in('id', cloudIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting cloud essays:', error);
      return false;
    }

    console.log('Deleted essays from cloud:', cloudIds.length);
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
            // Cloud is newer, update local - ALWAYS include essay_text
            console.log('Cloud essay loaded:', {
              id: cloud.id,
              essayTextLength: cloud.essay_text?.length || 0,
              wordCount: cloud.word_count || 0,
            });
            mergedEssays.push({
              localId: local.localId,
              examType: cloud.exam_type as LocalEssay['examType'],
              topic: cloud.topic || '',
              essayText: cloud.essay_text || '', // Always include essay_text
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
            console.log('Cloud essay loaded (new):', {
              id: cloud.id,
              essayTextLength: cloud.essay_text?.length || 0,
              wordCount: cloud.word_count || 0,
            });
            mergedEssays.push({
              localId,
              examType: cloud.exam_type as LocalEssay['examType'],
              topic: cloud.topic || '',
              essayText: cloud.essay_text || '', // Always include essay_text
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
    deleteCloudEssays,
    fetchCloudEssays,
    getUserStorageUsage
  };
}
