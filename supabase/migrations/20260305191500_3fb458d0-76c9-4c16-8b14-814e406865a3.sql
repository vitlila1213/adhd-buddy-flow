-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  whatsapp_number text UNIQUE,
  subscription_status text NOT NULL DEFAULT 'inactive',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Add user_id column to itens_cerebro
ALTER TABLE public.itens_cerebro ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS on itens_cerebro to use user_id for authenticated users
DROP POLICY IF EXISTS "Users can delete items " ON public.itens_cerebro;
DROP POLICY IF EXISTS "Users can insert items " ON public.itens_cerebro;
DROP POLICY IF EXISTS "Users can update items " ON public.itens_cerebro;
DROP POLICY IF EXISTS "Users can view their own items " ON public.itens_cerebro;

CREATE POLICY "Users can view own items" ON public.itens_cerebro
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own items" ON public.itens_cerebro
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own items" ON public.itens_cerebro
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own items" ON public.itens_cerebro
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Apply updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for itens_cerebro
ALTER PUBLICATION supabase_realtime ADD TABLE public.itens_cerebro;