/**
 * Essay Corrections Data Access Hook
 * Simple system for teacher corrections with yellow highlights
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EssayCorrection {
  id: string;
  essay_id: string;
  start_index: number;
  end_index: number;
  original_text: string;
  corrected_text: string;
  teacher_note: string | null;
  created_by: string;
  created_at: string;
}

export function useEssayCorrections() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  /**
   * Fetch all corrections for an essay
   */
  const fetchCorrections = useCallback(
    async (essayId: string): Promise<EssayCorrection[]> => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('essay_corrections')
          .select('*')
          .eq('essay_id', essayId)
          .order('start_index', { ascending: true });

        if (error) throw error;

        return (data || []) as EssayCorrection[];
      } catch (error: any) {
        console.error('Error fetching corrections:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load corrections',
          variant: 'destructive',
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Add a new correction
   */
  const addCorrection = useCallback(
    async (params: {
      essay_id: string;
      start_index: number;
      end_index: number;
      original_text: string;
      corrected_text: string;
      teacher_note?: string;
    }): Promise<EssayCorrection | null> => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          throw new Error('Not authenticated');
        }

        const { data, error } = await supabase
          .from('essay_corrections')
          .insert({
            essay_id: params.essay_id,
            start_index: params.start_index,
            end_index: params.end_index,
            original_text: params.original_text,
            corrected_text: params.corrected_text,
            teacher_note: params.teacher_note || null,
            created_by: userData.user.id,
          })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Correction saved',
          description: 'Your correction has been saved',
        });

        return data as EssayCorrection;
      } catch (error: any) {
        console.error('Error adding correction:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to save correction',
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Update an existing correction
   */
  const updateCorrection = useCallback(
    async (
      id: string,
      updates: { corrected_text?: string; teacher_note?: string }
    ): Promise<EssayCorrection | null> => {
      setLoading(true);
      try {
        const updateData: any = {};
        if (updates.corrected_text !== undefined) updateData.corrected_text = updates.corrected_text;
        if (updates.teacher_note !== undefined) updateData.teacher_note = updates.teacher_note || null;

        const { data, error } = await supabase
          .from('essay_corrections')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Correction updated',
          description: 'Your correction has been updated',
        });

        return data as EssayCorrection;
      } catch (error: any) {
        console.error('Error updating correction:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to update correction',
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  /**
   * Delete a correction
   */
  const deleteCorrection = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase.from('essay_corrections').delete().eq('id', id);

        if (error) throw error;

        toast({
          title: 'Correction removed',
          description: 'The correction has been deleted',
        });

        return true;
      } catch (error: any) {
        console.error('Error deleting correction:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete correction',
          variant: 'destructive',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    loading,
    fetchCorrections,
    addCorrection,
    updateCorrection,
    deleteCorrection,
  };
}

