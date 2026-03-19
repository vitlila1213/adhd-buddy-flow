import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useItens } from "@/hooks/useItens";
import { useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";

interface UserGoal {
  id: string;
  user_id: string;
  daily_goal: number;
  xp: number;
  last_goal_completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useGamification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items } = useItens();
  const xpAwardedRef = useRef(false);

  const query = useQuery({
    queryKey: ["user_goals", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create default goal
        const { data: newData, error: insertError } = await supabase
          .from("user_goals")
          .insert({ user_id: user.id, daily_goal: 5, xp: 0 })
          .select()
          .single();
        if (insertError) throw insertError;
        return newData as UserGoal;
      }
      return data as UserGoal;
    },
    enabled: !!user,
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const completedToday = useMemo(() => {
    const all = items || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return all.filter((i) => {
      if (i.status !== "concluida") return false;
      const updated = new Date(i.updated_at);
      updated.setHours(0, 0, 0, 0);
      return updated.getTime() === today.getTime();
    }).length;
  }, [items]);

  const goal = query.data;
  const dailyGoal = goal?.daily_goal ?? 5;
  const xp = goal?.xp ?? 0;
  const progress = Math.min((completedToday / dailyGoal) * 100, 100);
  const goalReached = completedToday >= dailyGoal;
  const alreadyAwarded = goal?.last_goal_completed_date === todayStr;

  // Award XP when goal is reached
  useEffect(() => {
    if (goalReached && !alreadyAwarded && goal && !xpAwardedRef.current) {
      xpAwardedRef.current = true;
      supabase
        .from("user_goals")
        .update({
          xp: (goal.xp || 0) + 10,
          last_goal_completed_date: todayStr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goal.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["user_goals"] });
          toast.success("🎉 Meta diária atingida! +10 XP", {
            description: `Você completou ${completedToday} tarefas hoje!`,
          });
        });
    }
    if (!goalReached) {
      xpAwardedRef.current = false;
    }
  }, [goalReached, alreadyAwarded, goal, todayStr, completedToday, queryClient]);

  const updateGoal = useMutation({
    mutationFn: async (newGoal: number) => {
      if (!goal) return;
      const { error } = await supabase
        .from("user_goals")
        .update({ daily_goal: newGoal, updated_at: new Date().toISOString() })
        .eq("id", goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_goals"] });
      toast.success("Meta atualizada!");
    },
  });

  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  return {
    dailyGoal,
    xp,
    level,
    xpInLevel,
    completedToday,
    progress,
    goalReached,
    alreadyAwarded,
    updateGoal,
    isLoading: query.isLoading,
  };
};
