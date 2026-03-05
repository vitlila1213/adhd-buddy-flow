
-- Adicionar coluna de expiração da assinatura na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz DEFAULT NULL;

-- Criar função para verificar e cancelar assinaturas vencidas
CREATE OR REPLACE FUNCTION public.check_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET subscription_status = 'cancelled',
      updated_at = now()
  WHERE subscription_status = 'active'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < now();
END;
$$;
