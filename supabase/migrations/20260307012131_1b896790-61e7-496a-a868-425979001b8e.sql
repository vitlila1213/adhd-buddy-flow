
-- Table to store activations for users who haven't signed up yet
CREATE TABLE public.pending_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  subscription_status text NOT NULL DEFAULT 'active',
  credits integer NOT NULL DEFAULT -1,
  subscription_expires_at timestamp with time zone,
  whatsapp_number text,
  platform text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- No RLS needed - only accessed by service role in triggers/functions
ALTER TABLE public.pending_activations ENABLE ROW LEVEL SECURITY;

-- Update handle_new_user to check pending_activations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pending RECORD;
BEGIN
  -- Check if there's a pending activation for this email
  SELECT * INTO pending FROM public.pending_activations WHERE email = NEW.email LIMIT 1;
  
  IF pending IS NOT NULL THEN
    -- Create profile with premium data
    INSERT INTO public.profiles (id, email, subscription_status, credits, subscription_expires_at, whatsapp_number)
    VALUES (
      NEW.id,
      NEW.email,
      pending.subscription_status,
      pending.credits,
      pending.subscription_expires_at,
      pending.whatsapp_number
    );
    -- Remove the pending activation
    DELETE FROM public.pending_activations WHERE email = NEW.email;
  ELSE
    -- Default: 10 free credits
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;
