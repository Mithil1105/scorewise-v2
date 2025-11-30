import { useState, useEffect, useCallback, useRef } from 'react';
import { LocalEssay, LocalImage } from '@/types/essay';

const ESSAYS_KEY = 'scorewise_essays';
const IMAGES_KEY = 'scorewise_images';

export function useLocalEssays() {
  const [essays, setEssays] = useState<LocalEssay[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(ESSAYS_KEY);
    if (stored) {
      try {
        setEssays(JSON.parse(stored));
      } catch {
        setEssays([]);
      }
    }
  }, []);

  const saveEssays = useCallback((newEssays: LocalEssay[]) => {
    localStorage.setItem(ESSAYS_KEY, JSON.stringify(newEssays));
    setEssays(newEssays);
    // Log total essays and their text lengths
    const totalTextLength = newEssays.reduce((sum, e) => sum + (e.essayText?.length || 0), 0);
    console.log('Draft saved:', {
      totalEssays: newEssays.length,
      totalTextLength,
      essaysWithText: newEssays.filter(e => e.essayText && e.essayText.length > 0).length,
    });
  }, []);

  const addEssay = useCallback((essay: LocalEssay) => {
    setEssays(prev => {
      const updated = [...prev, essay];
      localStorage.setItem(ESSAYS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateEssay = useCallback((localId: string, updates: Partial<LocalEssay>) => {
    setEssays(prev => {
      const updated = prev.map(e => 
        e.localId === localId 
          ? { ...e, ...updates, updatedAt: new Date().toISOString() }
          : e
      );
      localStorage.setItem(ESSAYS_KEY, JSON.stringify(updated));
      const updatedEssay = updated.find(e => e.localId === localId);
      if (updatedEssay && updates.essayText !== undefined) {
        console.log('Draft saved:', {
          localId: updatedEssay.localId,
          essayTextLength: updatedEssay.essayText?.length || 0,
          wordCount: updatedEssay.wordCount,
        });
      }
      return updated;
    });
  }, []);

  const deleteEssay = useCallback((localId: string) => {
    setEssays(prev => {
      const updated = prev.filter(e => e.localId !== localId);
      localStorage.setItem(ESSAYS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getEssay = useCallback((localId: string) => {
    return essays.find(e => e.localId === localId);
  }, [essays]);

  return { essays, saveEssays, addEssay, updateEssay, deleteEssay, getEssay };
}

export function useLocalImages() {
  const [images, setImages] = useState<LocalImage[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(IMAGES_KEY);
    if (stored) {
      try {
        setImages(JSON.parse(stored));
      } catch {
        setImages([]);
      }
    }
  }, []);

  const saveImages = useCallback((newImages: LocalImage[]) => {
    localStorage.setItem(IMAGES_KEY, JSON.stringify(newImages));
    setImages(newImages);
  }, []);

  const addImage = useCallback((image: LocalImage) => {
    setImages(prev => {
      const updated = [...prev, image];
      localStorage.setItem(IMAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getImagesForEssay = useCallback((essayLocalId: string) => {
    return images.filter(i => i.essayLocalId === essayLocalId);
  }, [images]);

  const deleteImagesForEssay = useCallback((essayLocalId: string) => {
    setImages(prev => {
      const updated = prev.filter(i => i.essayLocalId !== essayLocalId);
      localStorage.setItem(IMAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { images, saveImages, addImage, getImagesForEssay, deleteImagesForEssay };
}

export function useAutoSave(
  essayText: string,
  localId: string | null,
  updateEssay: (id: string, updates: Partial<LocalEssay>) => void,
  enabled: boolean = true
) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(essayText);

  useEffect(() => {
    if (!enabled || !localId || essayText === lastSavedRef.current) return;

    setSaveStatus('saving');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const wordCount = essayText.trim().split(/\s+/).filter(Boolean).length;
      updateEssay(localId, { essayText, wordCount });
      lastSavedRef.current = essayText;
      setSaveStatus('saved');
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 5000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [essayText, localId, updateEssay, enabled]);

  const forceSave = useCallback(() => {
    if (!localId) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const wordCount = essayText.trim().split(/\s+/).filter(Boolean).length;
    updateEssay(localId, { essayText, wordCount });
    lastSavedRef.current = essayText;
    setSaveStatus('saved');
  }, [essayText, localId, updateEssay]);

  return { saveStatus, forceSave };
}
