-- ============================================
-- UPDATE USER PROFILE NAME
-- Run this to set/update the display_name for a user
-- ============================================

-- Update display_name for a specific user by email
UPDATE public.profiles
SET display_name = 'Mithil Mistry'  -- ⬅️ CHANGE THIS TO THE DESIRED NAME
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'mithil20056mistry@gmail.com'  -- ⬅️ CHANGE THIS TO THE USER'S EMAIL
);

-- Verify the name was updated
SELECT 
  u.email,
  p.display_name,
  p.user_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'mithil20056mistry@gmail.com';  -- ⬅️ CHANGE THIS TO THE USER'S EMAIL

