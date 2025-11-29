-- ============================================
-- IMPROVE PROFILE NAME HANDLING
-- This ensures all new users get a proper display_name
-- ============================================

-- Update the trigger function to better handle names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Try to get name from metadata in this order:
  -- 1. full_name from raw_user_meta_data
  -- 2. name from raw_user_meta_data
  -- 3. Extract name from email (part before @)
  -- 4. Fallback to "User" if nothing works
  user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    INITCAP(REPLACE(split_part(NEW.email, '@', 1), '.', ' ')),  -- Convert email prefix to readable name
    'User'  -- Final fallback
  );
  
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    user_name,
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = COALESCE(public.profiles.display_name, user_name);
  
  RETURN NEW;
END;
$$;

-- Update existing users who don't have a display_name
UPDATE public.profiles
SET display_name = INITCAP(REPLACE(split_part(
  (SELECT email FROM auth.users WHERE id = profiles.user_id), 
  '@', 1
), '.', ' '))
WHERE display_name IS NULL OR display_name = '';

