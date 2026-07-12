-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general', -- 'winner', 'general', 'tournament_result'
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  winner_user_id UUID, -- Reference to the winner's user_id
  prize_amount DECIMAL(10,2),
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can view published announcements
CREATE POLICY "Anyone can view published announcements"
ON public.announcements FOR SELECT
USING (is_published = true);

-- Admins can view all announcements (including unpublished)
CREATE POLICY "Admins can view all announcements"
ON public.announcements FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can create announcements
CREATE POLICY "Admins can create announcements"
ON public.announcements FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can update announcements
CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();