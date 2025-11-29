-- ============================================
-- ASSIGN ROLES TO EXISTING USERS
-- Run this AFTER creating users via Dashboard
-- ============================================
-- 
-- Instructions:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Create these 4 users manually:
--    - admin@sw.com (password: QWERTYUI) - check "Auto Confirm User"
--    - student@sw.com (password: QWERTYUI) - check "Auto Confirm User"
--    - teacher@sw.com (password: QWERTYUI) - check "Auto Confirm User"
--    - cme@sw.com (password: QWERTYUI) - check "Auto Confirm User"
-- 3. Then run this SQL to assign the admin role

-- Assign platform admin role to admin@sw.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@sw.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Set display names for all users (if profiles don't exist or names are missing)
INSERT INTO public.profiles (user_id, display_name)
SELECT 
  id,
  CASE email
    WHEN 'admin@sw.com' THEN 'Master Admin'
    WHEN 'student@sw.com' THEN 'Student Account'
    WHEN 'teacher@sw.com' THEN 'Teacher Account'
    WHEN 'cme@sw.com' THEN 'Institutional Admin'
    ELSE INITCAP(REPLACE(split_part(email, '@', 1), '.', ' '))
  END
FROM auth.users
WHERE email IN ('admin@sw.com', 'student@sw.com', 'teacher@sw.com', 'cme@sw.com')
ON CONFLICT (user_id) DO UPDATE
SET display_name = EXCLUDED.display_name
WHERE profiles.display_name IS NULL OR profiles.display_name = '';

-- Verify the role and names were assigned
SELECT 
  u.email,
  p.display_name,
  ur.role,
  u.id
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email IN ('admin@sw.com', 'student@sw.com', 'teacher@sw.com', 'cme@sw.com')
ORDER BY u.email;

