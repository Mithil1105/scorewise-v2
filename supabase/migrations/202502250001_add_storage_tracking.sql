-- Add storage tracking to essays table
-- This migration is idempotent and can be run multiple times safely

-- Add storage_size_kb column to track essay text size in kilobytes
ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS storage_size_kb INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.essays.storage_size_kb IS 'Size of essay_text in kilobytes. Auto-calculated on insert/update.';

-- Update existing essays to calculate their storage_size_kb
UPDATE public.essays
SET storage_size_kb = CEIL(LENGTH(essay_text) / 1024.0)
WHERE essay_text IS NOT NULL AND (storage_size_kb = 0 OR storage_size_kb IS NULL);

-- Create index for faster storage usage queries
CREATE INDEX IF NOT EXISTS idx_essays_user_id_storage_size 
ON public.essays(user_id, storage_size_kb);

-- Ensure RLS policies allow users to view/update their own essays
-- Drop existing policies if they exist (idempotent)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own essays" ON public.essays;
    DROP POLICY IF EXISTS "Users can update their own essays" ON public.essays;
END $$;

-- Policy: Users can view their own essays
CREATE POLICY "Users can view their own essays"
ON public.essays FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own essays
CREATE POLICY "Users can update their own essays"
ON public.essays FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger function to auto-calculate storage_size_kb
CREATE OR REPLACE FUNCTION public.calculate_essay_storage_size()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate size of essay_text in kilobytes
  IF NEW.essay_text IS NOT NULL THEN
    NEW.storage_size_kb := CEIL(LENGTH(NEW.essay_text) / 1024.0);
  ELSE
    NEW.storage_size_kb := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (idempotent)
DROP TRIGGER IF EXISTS trigger_calculate_essay_storage_size ON public.essays;

-- Create trigger to auto-calculate storage_size_kb on insert/update
CREATE TRIGGER trigger_calculate_essay_storage_size
BEFORE INSERT OR UPDATE OF essay_text ON public.essays
FOR EACH ROW
EXECUTE FUNCTION public.calculate_essay_storage_size();

