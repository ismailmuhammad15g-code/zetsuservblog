-- Fix: Create missing categories table and update posts

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Security for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add column to posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 4. Insert some default categories
INSERT INTO public.categories (name, slug) VALUES
  ('Technology', 'technology'),
  ('Programming', 'programming'),
  ('Lifestyle', 'lifestyle'),
  ('Tutorials', 'tutorials')
ON CONFLICT (name) DO NOTHING;
