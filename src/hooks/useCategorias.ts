import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Categoria {
  id: string;
  user_id: string;
  nome: string;
  tipo: "financa" | "tarefa";
  cor: string;
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
    mutationFn: async ({ nome, tipo, cor }: { nome: string; tipo: "financa" | "tarefa"; cor?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("categorias")
        .insert({
          user_id: user.id,
          nome,
          tipo,
          ...(cor ? { cor } : {}),
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id, nome, tipo };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });

      // Auto-categorize uncategorized tasks when a tarefa category is created
      if (result.tipo === "tarefa" && user) {
        try {
          const { data } = await supabase.rpc("auto_categorize_tasks" as any, {
            p_category_id: result.id,
            p_category_name: result.nome,
            p_user_id: user.id,
          });
          const count = data as number;
          if (count > 0) {
            toast.info(`${count} tarefa(s) movida(s) para "${result.nome}" automaticamente!`);
            queryClient.invalidateQueries({ queryKey: ["itens_cerebro"] });
          }
        } catch (e) {
          console.error("Auto-categorize error:", e);
        }
      }
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, nome, cor }: { id: string; nome?: string; cor?: string }) => {
      const updateData: any = {};
      if (nome !== undefined) updateData.nome = nome;
      if (cor !== undefined) updateData.cor = cor;
      const { error } = await supabase.from("categorias").update(updateData).eq("id", id);
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
