import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

interface UseImageUploadOptions {
  bucket?: string;
  onSuccess?: (url: string, path: string) => void;
  onError?: (error: Error) => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { bucket = 'task1_images', onSuccess, onError } = options;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'Max 5MB allowed — try resizing the image.';
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PNG, JPG, and JPEG images are allowed.';
    }
    
    return null;
  }, []);

  const uploadImage = useCallback(async (
    file: File,
    userId: string,
    essayId?: string
  ): Promise<{ url: string; path: string } | null> => {
    const validationError = validateFile(file);
    if (validationError) {
      toast({
        title: 'Upload failed',
        description: validationError,
        variant: 'destructive',
      });
      onError?.(new Error(validationError));
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const folderPath = essayId ? `${userId}/${essayId}` : userId;
      const filePath = `${folderPath}/${timestamp}.${ext}`;

      setProgress(30);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      setProgress(100);

      toast({
        title: 'Image uploaded',
        description: 'Your image has been uploaded to the cloud.',
      });

      onSuccess?.(publicUrl, data.path);
      return { url: publicUrl, path: data.path };
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [bucket, validateFile, toast, onSuccess, onError]);

  const deleteImage = useCallback(async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }, [bucket]);

  const getPreviewUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  return {
    uploadImage,
    deleteImage,
    getPreviewUrl,
    validateFile,
    uploading,
    progress,
  };
}
