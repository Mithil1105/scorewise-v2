-- 1. Change ai_score from integer to numeric for 0.5 increment support
ALTER TABLE public.essays ALTER COLUMN ai_score TYPE numeric(3,1);

-- 2. Create peer_feedback table for peer review system
CREATE TABLE public.peer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id uuid NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_peer_feedback_essay ON public.peer_feedback(essay_id);
CREATE INDEX idx_peer_feedback_reviewer ON public.peer_feedback(reviewer_user_id);

-- Enable RLS
ALTER TABLE public.peer_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for peer_feedback
-- Anyone can view feedback for essays they have access to
CREATE POLICY "Users can view feedback on their essays"
ON public.peer_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.essays 
    WHERE essays.id = peer_feedback.essay_id 
    AND essays.user_id = auth.uid()
  )
);

-- Users can view feedback they gave
CREATE POLICY "Users can view their own feedback"
ON public.peer_feedback FOR SELECT
USING (reviewer_user_id = auth.uid());

-- Users can create feedback (but not on their own essays)
CREATE POLICY "Users can create feedback on others essays"
ON public.peer_feedback FOR INSERT
WITH CHECK (
  reviewer_user_id = auth.uid() AND
  NOT EXISTS (
    SELECT 1 FROM public.essays 
    WHERE essays.id = peer_feedback.essay_id 
    AND essays.user_id = auth.uid()
  )
);

-- Users can delete their own feedback
CREATE POLICY "Users can delete their own feedback"
ON public.peer_feedback FOR DELETE
USING (reviewer_user_id = auth.uid());

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.peer_feedback FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete any feedback
CREATE POLICY "Admins can delete any feedback"
ON public.peer_feedback FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add share_token column to essays for peer feedback sharing
ALTER TABLE public.essays ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Create index for share token lookup
CREATE INDEX IF NOT EXISTS idx_essays_share_token ON public.essays(share_token);

-- Policy for viewing shared essays via token (public access for shared essays)
CREATE POLICY "Anyone can view shared essays by token"
ON public.essays FOR SELECT
USING (share_token IS NOT NULL);

-- 4. Add exam_type column to ai_usage_logs for tracking
ALTER TABLE public.ai_usage_logs ADD COLUMN IF NOT EXISTS exam_type text;