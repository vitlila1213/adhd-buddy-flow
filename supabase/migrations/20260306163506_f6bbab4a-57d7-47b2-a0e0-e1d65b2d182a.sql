
-- Create categorias table
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'tarefa' CHECK (tipo IN ('financa', 'tarefa')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categorias
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- RLS policies for categorias
CREATE POLICY "Users can view own categorias" ON public.categorias FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own categorias" ON public.categorias FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own categorias" ON public.categorias FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own categorias" ON public.categorias FOR DELETE USING (user_id = auth.uid());

-- Create financas table
CREATE TABLE public.financas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT,
  data_vencimento TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  is_recorrente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on financas
ALTER TABLE public.financas ENABLE ROW LEVEL SECURITY;

-- RLS policies for financas
CREATE POLICY "Users can view own financas" ON public.financas FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own financas" ON public.financas FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own financas" ON public.financas FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own financas" ON public.financas FOR DELETE USING (user_id = auth.uid());

-- Add categoria_id to itens_cerebro
ALTER TABLE public.itens_cerebro ADD COLUMN categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL;
