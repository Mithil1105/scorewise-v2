import { SupabaseClient } from '@supabase/supabase-js';

export const MAX_STORAGE_KB = 5 * 1024; // 5MB in kilobytes

export interface StorageUsage {
  used: number;
  remaining: number;
  usedMb: number;
  remainingMb: number;
  limitMb: number;
}

/**
 * Get remaining storage for a user
 * @param supabase - Supabase client instance
 * @param userId - User ID to check storage for
 * @returns Storage usage information
 */
export const getRemainingStorage = async (
  supabase: SupabaseClient,
  userId: string
): Promise<StorageUsage> => {
  try {
    const { data, error } = await supabase
      .from('essays')
      .select('storage_size_kb')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching storage usage:', error);
      // Return safe defaults on error
      return {
        used: 0,
        remaining: MAX_STORAGE_KB,
        usedMb: 0,
        remainingMb: MAX_STORAGE_KB / 1024,
        limitMb: MAX_STORAGE_KB / 1024,
      };
    }

    const used = data?.reduce((sum, e) => sum + (e.storage_size_kb || 0), 0) || 0;
    const remaining = MAX_STORAGE_KB - used;

    console.log('Storage Used (KB):', used);
    console.log('Storage Remaining (KB):', remaining);

    return {
      used,
      remaining,
      usedMb: used / 1024,
      remainingMb: remaining / 1024,
      limitMb: MAX_STORAGE_KB / 1024,
    };
  } catch (err) {
    console.error('Error calculating storage usage:', err);
    return {
      used: 0,
      remaining: MAX_STORAGE_KB,
      usedMb: 0,
      remainingMb: MAX_STORAGE_KB / 1024,
      limitMb: MAX_STORAGE_KB / 1024,
    };
  }
};

/**
 * Calculate storage size in KB for a given text
 * @param text - Text to calculate size for
 * @returns Size in kilobytes (rounded up)
 */
export const calculateStorageSizeKb = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(new Blob([text]).size / 1024);
};

