-- Add storage tracking to essays table
-- This migration is idempotent and can be run multiple times safely

-- Add content_size column to track essay text size in bytes
ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS content_size INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.essays.content_size IS 'Size of essay_text in bytes. Auto-calculated on insert/update.';

-- Create function to calculate storage usage for a user
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(uid uuid)
RETURNS integer AS $$
  SELECT COALESCE(SUM(content_size), 0)
  FROM public.essays
  WHERE user_id = uid;
$$ LANGUAGE sql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.get_user_storage_usage IS 'Returns total storage usage in bytes for a user. Used to enforce 5MB limit.';

-- Create trigger function to auto-calculate content_size
CREATE OR REPLACE FUNCTION public.calculate_essay_content_size()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate size of essay_text in bytes (UTF-8 encoding: 1-4 bytes per character)
  -- Using pg_column_size for accurate byte count
  NEW.content_size := COALESCE(
    pg_column_size(NEW.essay_text) - pg_column_size(NULL::text),
    0
  );
  
  -- Fallback: if pg_column_size doesn't work, use length (approximate)
  IF NEW.content_size = 0 AND NEW.essay_text IS NOT NULL THEN
    NEW.content_size := LENGTH(NEW.essay_text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (idempotent)
DROP TRIGGER IF EXISTS trigger_calculate_essay_content_size ON public.essays;

-- Create trigger to auto-calculate content_size on insert/update
CREATE TRIGGER trigger_calculate_essay_content_size
BEFORE INSERT OR UPDATE OF essay_text ON public.essays
FOR EACH ROW
EXECUTE FUNCTION public.calculate_essay_content_size();

-- Update existing essays to calculate their content_size
UPDATE public.essays
SET content_size = COALESCE(
  pg_column_size(essay_text) - pg_column_size(NULL::text),
  CASE WHEN essay_text IS NOT NULL THEN LENGTH(essay_text) ELSE 0 END
)
WHERE content_size = 0 OR content_size IS NULL;

-- Create index for faster storage usage queries
CREATE INDEX IF NOT EXISTS idx_essays_user_id_content_size 
ON public.essays(user_id, content_size);

