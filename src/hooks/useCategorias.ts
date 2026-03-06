import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Categoria {
  id: string;
  user_id: string;
  nome: string;
  tipo: "financa" | "tarefa";
  created_at: string;
}

export const useCategorias = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["categorias", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("user_id", user.id)
        .order("nome");
      if (error) throw error;
      return data as Categoria[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async ({ nome, tipo }: { nome: string; tipo: "financa" | "tarefa" }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("categorias").insert({
        user_id: user.id,
        nome,
        tipo,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorias"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorias"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorias"] }),
  });

  return { ...query, create, update, remove };
};
