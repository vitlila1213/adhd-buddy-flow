-- Create table for brain items
CREATE TABLE public.itens_cerebro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ideia', 'tarefa')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora_agendada TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itens_cerebro ENABLE ROW LEVEL SECURITY;

-- RLS policies (open for now since auth is phone-based, filtering done client-side)
CREATE POLICY "Users can view their own items"
  ON public.itens_cerebro FOR SELECT USING (true);

CREATE POLICY "Users can insert items"
  ON public.itens_cerebro FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update items"
  ON public.itens_cerebro FOR UPDATE USING (true);

CREATE POLICY "Users can delete items"
  ON public.itens_cerebro FOR DELETE USING (true);

-- Indexes
CREATE INDEX idx_itens_cerebro_user_phone ON public.itens_cerebro(user_phone);
CREATE INDEX idx_itens_cerebro_schedule ON public.itens_cerebro(status, data_hora_agendada);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_itens_cerebro_updated_at
  BEFORE UPDATE ON public.itens_cerebro
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();