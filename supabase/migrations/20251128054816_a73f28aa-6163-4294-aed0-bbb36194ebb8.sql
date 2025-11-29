-- Create storage bucket for task1 images
INSERT INTO storage.buckets (id, name, public)
VALUES ('task1_images', 'task1_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task1_images bucket
CREATE POLICY "Users can upload their own task1 images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'task1_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own task1 images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task1_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own task1 images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'task1_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view task1 images for shared essays"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task1_images');

-- Add task1_image_url column to essays table
ALTER TABLE public.essays
ADD COLUMN IF NOT EXISTS task1_image_url text;

-- Update task1_images table to store URL instead of base64
ALTER TABLE public.task1_images
ADD COLUMN IF NOT EXISTS storage_path text;