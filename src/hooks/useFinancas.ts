import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Financa {
  id: string;
  user_id: string;
  categoria_id: string | null;
  tipo: "receita" | "despesa";
  valor: number;
  descricao: string | null;
  data_vencimento: string | null;
  status: "pago" | "pendente";
  is_recorrente: boolean;
  created_at: string;
}

export const useFinancas = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["financas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("financas")
        .select("*, categorias(nome)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Financa & { categorias: { nome: string } | null })[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (input: {
      tipo: "receita" | "despesa";
      valor: number;
      descricao?: string;
      categoria_id?: string;
      data_vencimento?: string;
      status?: "pago" | "pendente";
      is_recorrente?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("financas").insert({
        user_id: user.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financas"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Financa>) => {
      const { error } = await supabase.from("financas").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financas"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financas"] }),
  });

  return { ...query, create, update, remove };
};
