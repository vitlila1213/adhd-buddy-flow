
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_remarketing_at timestamptz;

CREATE OR REPLACE FUNCTION public.auto_categorize_tasks(p_category_id uuid, p_category_name text, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE itens_cerebro
  SET categoria_id = p_category_id
  WHERE user_id = p_user_id
    AND categoria_id IS NULL
    AND tipo = 'tarefa'
    AND (
      LOWER(titulo) ILIKE '%' || LOWER(p_category_name) || '%'
      OR LOWER(COALESCE(descricao, '')) ILIKE '%' || LOWER(p_category_name) || '%'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
