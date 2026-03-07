import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Aniversariante {
  id: string;
  user_id: string;
  user_phone: string;
  nome: string;
  data_aniversario: string;
  parentesco: string;
  created_at: string;
  updated_at: string;
}

const PARENTESCOS = [
  "amigo", "amiga", "pai", "mãe", "irmão", "irmã",
  "tio", "tia", "primo", "prima", "avô", "avó",
  "filho", "filha", "esposo", "esposa", "namorado", "namorada",
  "sogro", "sogra", "cunhado", "cunhada", "colega", "chefe", "outro"
] as const;

export { PARENTESCOS };

export const useAniversariantes = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["aniversariantes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("aniversariantes")
        .select("*")
        .eq("user_id", user.id)
        .order("data_aniversario", { ascending: true });
      if (error) throw error;
      return data as Aniversariante[];
    },
    enabled: !!user,
  });

  const addAniversariante = useMutation({
    mutationFn: async (data: { nome: string; data_aniversario: string; parentesco: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("aniversariantes").insert({
        ...data,
        user_id: user.id,
        user_phone: profile?.whatsapp_number || "",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aniversariantes"] }),
  });

  const deleteAniversariante = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aniversariantes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aniversariantes"] }),
  });

  return { ...query, addAniversariante, deleteAniversariante };
};
