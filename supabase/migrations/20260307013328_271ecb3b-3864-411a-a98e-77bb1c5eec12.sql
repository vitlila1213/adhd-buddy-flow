
-- Fix current profile for victor.faridoff@gmail.com
UPDATE public.profiles 
SET subscription_status = 'active', 
    credits = -1, 
    subscription_expires_at = '2026-04-06T01:25:19.339Z'::timestamptz,
    updated_at = now()
WHERE email = 'victor.faridoff@gmail.com';

-- Clean up the pending activation
DELETE FROM public.pending_activations WHERE email = 'victor.faridoff@gmail.com';

-- Recreate the trigger function to ensure it's working
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
  SELECT * INTO pending FROM public.pending_activations WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;
  
  IF FOUND THEN
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
    DELETE FROM public.pending_activations WHERE LOWER(email) = LOWER(NEW.email);
  ELSE
    -- Default: 10 free credits
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;
