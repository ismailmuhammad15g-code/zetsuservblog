-- Create announcements table
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    icon TEXT DEFAULT 'megaphone',
    link TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read active announcements
CREATE POLICY "Anyone can read active announcements"
ON public.announcements
FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default announcements
INSERT INTO public.announcements (text, icon, link, display_order) VALUES
('📰 Read our official ZetsuBlog on Hashnode!', 'newspaper', 'https://zetsu.hashnode.dev/', 1),
('🎉 Welcome to ZetsuServ Blog - Your source for tech insights!', 'sparkles', NULL, 2),
('⚡ New features coming soon - Stay tuned!', 'zap', NULL, 3),
('📢 Join our community and start sharing your thoughts!', 'megaphone', NULL, 4);