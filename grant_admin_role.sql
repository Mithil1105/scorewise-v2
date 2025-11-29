-- ============================================
-- GRANT ADMIN ROLE TO A USER AND SET NAME
-- Replace email and name as needed
-- ============================================

-- Grant platform admin role to a user by email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'mithil20056mistry@gmail.com'  -- ⬅️ CHANGE THIS TO THE USER'S EMAIL
ON CONFLICT (user_id, role) DO NOTHING;

-- Set/update the display_name for the user
INSERT INTO public.profiles (user_id, display_name)
SELECT id, 'Mithil Mistry'  -- ⬅️ CHANGE THIS TO THE DESIRED NAME
FROM auth.users
WHERE email = 'mithil20056mistry@gmail.com'  -- ⬅️ CHANGE THIS TO THE USER'S EMAIL
ON CONFLICT (user_id) DO UPDATE
SET display_name = 'Mithil Mistry';  -- ⬅️ CHANGE THIS TO THE DESIRED NAME

-- Verify the role and name were assigned
SELECT 
  u.email,
  u.id,
  p.display_name,
  ur.role,
  ur.created_at as role_assigned_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'mithil20056mistry@gmail.com'  -- ⬅️ CHANGE THIS TO THE USER'S EMAIL
ORDER BY ur.created_at DESC;

