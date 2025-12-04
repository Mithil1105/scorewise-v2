-- Fix get_user_emails function to ensure proper return type
-- This fixes the "structure of query does not match function result type" error

CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id::uuid as user_id,
    COALESCE(u.email::text, '')::text as email
  FROM auth.users u
  WHERE u.id = ANY(user_ids)
  AND u.email IS NOT NULL;
END;
$$;

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO authenticated;

-- Also create a version that handles empty arrays gracefully
CREATE OR REPLACE FUNCTION public.get_user_emails_safe(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Return empty result if array is empty or null
  IF user_ids IS NULL OR array_length(user_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id::uuid as user_id,
    COALESCE(u.email::text, '')::text as email
  FROM auth.users u
  WHERE u.id = ANY(user_ids)
  AND u.email IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_emails_safe(uuid[]) TO authenticated;

