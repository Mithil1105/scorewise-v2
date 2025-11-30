-- Create contact_messages table for storing contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages(email);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert contact messages (public form)
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Only authenticated admins can view contact messages
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

