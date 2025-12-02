-- Add theme_preference column to profiles table
-- Stores user's preferred theme: 'light', 'dark', or 'vibrant'

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'vibrant'));

-- Add comment
COMMENT ON COLUMN public.profiles.theme_preference IS 'User preferred theme mode: light (default), dark, or vibrant.';

-- Update existing profiles to have 'light' as default
UPDATE public.profiles
SET theme_preference = 'light'
WHERE theme_preference IS NULL;

-- RLS policies already allow users to update their own profile
-- No additional policies needed as existing "Users can update their own profile" covers this

