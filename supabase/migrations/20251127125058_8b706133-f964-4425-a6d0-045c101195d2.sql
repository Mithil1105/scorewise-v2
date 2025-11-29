-- Create essays table
CREATE TABLE public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_type TEXT NOT NULL,
  topic TEXT,
  essay_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  word_count INTEGER DEFAULT 0,
  ai_score INTEGER,
  ai_feedback TEXT,
  local_id TEXT
);

-- Create task1_images table
CREATE TABLE public.task1_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID REFERENCES public.essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_base64 TEXT,
  image_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task1_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Essays RLS policies
CREATE POLICY "Users can view their own essays"
ON public.essays FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own essays"
ON public.essays FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essays"
ON public.essays FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essays"
ON public.essays FOR DELETE
USING (auth.uid() = user_id);

-- Task1 images RLS policies
CREATE POLICY "Users can view their own images"
ON public.task1_images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own images"
ON public.task1_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
ON public.task1_images FOR DELETE
USING (auth.uid() = user_id);

-- Profiles RLS policies
CREATE POLICY "Profiles are viewable by owner"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_essays_updated_at
BEFORE UPDATE ON public.essays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();