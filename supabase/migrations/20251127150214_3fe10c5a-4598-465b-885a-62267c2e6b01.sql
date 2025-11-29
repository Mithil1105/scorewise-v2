-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- GRE Topics table
CREATE TABLE public.gre_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gre_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view GRE topics"
ON public.gre_topics FOR SELECT USING (true);

CREATE POLICY "Admins can insert GRE topics"
ON public.gre_topics FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update GRE topics"
ON public.gre_topics FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete GRE topics"
ON public.gre_topics FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_gre_topics_updated_at
BEFORE UPDATE ON public.gre_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IELTS Task 1 table
CREATE TABLE public.ielts_t1 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_base64 TEXT,
    image_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ielts_t1 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view IELTS T1"
ON public.ielts_t1 FOR SELECT USING (true);

CREATE POLICY "Admins can insert IELTS T1"
ON public.ielts_t1 FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update IELTS T1"
ON public.ielts_t1 FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete IELTS T1"
ON public.ielts_t1 FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ielts_t1_updated_at
BEFORE UPDATE ON public.ielts_t1
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- IELTS Task 2 table
CREATE TABLE public.ielts_t2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ielts_t2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view IELTS T2"
ON public.ielts_t2 FOR SELECT USING (true);

CREATE POLICY "Admins can insert IELTS T2"
ON public.ielts_t2 FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update IELTS T2"
ON public.ielts_t2 FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete IELTS T2"
ON public.ielts_t2 FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ielts_t2_updated_at
BEFORE UPDATE ON public.ielts_t2
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vocabulary words table
CREATE TABLE public.vocab_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL UNIQUE,
    meaning TEXT NOT NULL,
    mf_example TEXT,
    friends_example TEXT,
    gg_example TEXT,
    tbbt_example TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vocab words"
ON public.vocab_words FOR SELECT USING (true);

CREATE POLICY "Admins can insert vocab words"
ON public.vocab_words FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vocab words"
ON public.vocab_words FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete vocab words"
ON public.vocab_words FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_vocab_words_updated_at
BEFORE UPDATE ON public.vocab_words
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI usage logs table
CREATE TABLE public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
ON public.ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI usage"
ON public.ai_usage_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert AI usage"
ON public.ai_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete AI usage logs"
ON public.ai_usage_logs FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- AI quotas table
CREATE TABLE public.ai_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    daily_limit INTEGER DEFAULT 50,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quota"
ON public.ai_quotas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quotas"
ON public.ai_quotas FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert quotas"
ON public.ai_quotas FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quotas"
ON public.ai_quotas FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admin audit log table
CREATE TABLE public.admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User bans table
CREATE TABLE public.user_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    reason TEXT,
    banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bans"
ON public.user_bans FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bans"
ON public.user_bans FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bans"
ON public.user_bans FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-seed admin role for admin@SW.com
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin@sw.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-seed admin on signup
CREATE TRIGGER on_auth_user_created_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_admin_signup();

-- Update essays table to allow admin access
CREATE POLICY "Admins can view all essays"
ON public.essays FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all essays"
ON public.essays FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all essays"
ON public.essays FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles table to allow admin access
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));