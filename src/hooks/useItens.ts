import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type ItemCerebro = Tables<"itens_cerebro"> & {
  categorias?: { nome: string; cor: string } | null;
};

export const useItens = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["itens_cerebro", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("itens_cerebro")
        .select("*, categorias(nome, cor)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ItemCerebro[];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, completed_at }: { id: string; status: string; completed_at?: string }) => {
      const updateData: any = { status };
      if (completed_at) updateData.completed_at = completed_at;
      if (status !== "concluida") updateData.completed_at = null;
      const { error } = await supabase
        .from("itens_cerebro")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["itens_cerebro"] }),
  });

  const updateTipo = useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: string }) => {
      const { error } = await supabase
        .from("itens_cerebro")
        .update({ tipo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["itens_cerebro"] }),
  });

  return { ...query, updateStatus, updateTipo };
};
