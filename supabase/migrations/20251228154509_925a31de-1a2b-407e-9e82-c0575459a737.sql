-- Create categories table
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text,
    color text DEFAULT '#3b82f6',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories
CREATE POLICY "Anyone can read categories"
ON public.categories
FOR SELECT
USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add category_id to posts table
ALTER TABLE public.posts ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create user_preferences table for onboarding survey
CREATE TABLE public.user_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    company_type text,
    team_size text,
    interests text[],
    content_preferences text[],
    onboarding_completed boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can read their own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default categories
INSERT INTO public.categories (name, slug, description, color) VALUES
('Technology', 'technology', 'Tech news and tutorials', '#3b82f6'),
('Business', 'business', 'Business insights and strategies', '#10b981'),
('Design', 'design', 'UI/UX and design tips', '#8b5cf6'),
('Development', 'development', 'Programming and coding', '#f59e0b'),
('Marketing', 'marketing', 'Digital marketing tips', '#ef4444'),
('Lifestyle', 'lifestyle', 'Personal growth and life tips', '#ec4899');

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();