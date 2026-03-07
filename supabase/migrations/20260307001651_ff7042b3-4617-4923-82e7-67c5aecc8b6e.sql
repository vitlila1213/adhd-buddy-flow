
CREATE TABLE public.aniversariantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_phone TEXT NOT NULL,
  nome TEXT NOT NULL,
  data_aniversario DATE NOT NULL,
  parentesco TEXT NOT NULL DEFAULT 'amigo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.aniversariantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own aniversariantes" ON public.aniversariantes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own aniversariantes" ON public.aniversariantes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own aniversariantes" ON public.aniversariantes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own aniversariantes" ON public.aniversariantes FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_aniversariantes_updated_at BEFORE UPDATE ON public.aniversariantes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
