-- Cleanup script: Remove essays with no content
-- Run this after deployment via dashboard

-- Delete essays where storage_size_kb is 0 (empty essays)
DELETE FROM public.essays 
WHERE storage_size_kb = 0 OR storage_size_kb IS NULL;

-- Optional: Also delete essays with no essay_text
DELETE FROM public.essays 
WHERE essay_text IS NULL OR TRIM(essay_text) = '';

