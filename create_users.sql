-- ============================================
-- CREATE USERS IN SUPABASE
-- Run this in Supabase SQL Editor
-- ============================================
-- 
-- IMPORTANT: This uses direct insert into auth.users
-- If this fails due to permissions, use the alternative method below
-- (using Supabase CLI or Admin API)

-- Enable pgcrypto extension if not already enabled (for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create helper function to insert users into auth.users
CREATE OR REPLACE FUNCTION public.create_auth_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id UUID;
  password_hash TEXT;
  instance_id_val UUID;
BEGIN
  -- Get the instance_id from existing users (or use default)
  SELECT COALESCE((SELECT instance_id FROM auth.users LIMIT 1), '00000000-0000-0000-0000-000000000000'::UUID)
  INTO instance_id_val;
  
  -- Generate UUID for new user
  user_id := gen_random_uuid();
  
  -- Hash password using bcrypt (Supabase standard)
  password_hash := crypt(user_password, gen_salt('bf', 10));
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_sso_user,
    deleted_at
  ) VALUES (
    instance_id_val,
    user_id,
    'authenticated',
    'authenticated',
    user_email,
    password_hash,
    now(), -- email_confirmed_at - auto-confirm email
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('email', user_email),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    NULL
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO user_id;
  
  -- If user already exists (by email), get existing ID
  IF user_id IS NULL THEN
    SELECT id INTO user_id FROM auth.users WHERE email = user_email LIMIT 1;
  END IF;
  
  RETURN user_id;
END;
$$;

-- Now create the four users
DO $$
DECLARE
  admin_user_id UUID;
  student_user_id UUID;
  teacher_user_id UUID;
  cme_user_id UUID;
BEGIN
  -- 1. Create admin@sw.com (master admin)
  admin_user_id := public.create_auth_user('admin@sw.com', 'QWERTYUI');
  
  -- 2. Create student@sw.com
  student_user_id := public.create_auth_user('student@sw.com', 'QWERTYUI');
  
  -- 3. Create teacher@sw.com
  teacher_user_id := public.create_auth_user('teacher@sw.com', 'QWERTYUI');
  
  -- 4. Create cme@sw.com (institutional admin)
  cme_user_id := public.create_auth_user('cme@sw.com', 'QWERTYUI');
  
  -- Ensure admin@sw.com has platform admin role
  INSERT INTO public.user_roles (user_id, role)
  SELECT admin_user_id, 'admin'::public.app_role
  WHERE admin_user_id IS NOT NULL
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Set display names for all users
  INSERT INTO public.profiles (user_id, display_name)
  VALUES
    (admin_user_id, 'Master Admin'),
    (student_user_id, 'Student Account'),
    (teacher_user_id, 'Teacher Account'),
    (cme_user_id, 'Institutional Admin')
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name;
  
  RAISE NOTICE 'Users created successfully!';
  RAISE NOTICE 'Admin ID: %', admin_user_id;
  RAISE NOTICE 'Student ID: %', student_user_id;
  RAISE NOTICE 'Teacher ID: %', teacher_user_id;
  RAISE NOTICE 'CME ID: %', cme_user_id;
END;
$$;

