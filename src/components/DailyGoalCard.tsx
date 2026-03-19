import { useState } from "react";
import { useGamification } from "@/hooks/useGamification";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Settings2, Check, Zap, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const DailyGoalCard = () => {
  const {
    dailyGoal,
    completedToday,
    progress,
    goalReached,
    alreadyAwarded,
    xp,
    level,
    xpInLevel,
    updateGoal,
  } = useGamification();

  const [showSettings, setShowSettings] = useState(false);
  const [newGoal, setNewGoal] = useState(dailyGoal);

  const handleSave = () => {
    if (newGoal >= 1 && newGoal <= 50) {
      updateGoal.mutate(newGoal);
      setShowSettings(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Meta Diária</h3>
            <p className="text-[10px] text-muted-foreground">
              {completedToday}/{dailyGoal} tarefas concluídas
            </p>
          </div>
        </div>
        <button
          onClick={() => { setNewGoal(dailyGoal); setShowSettings(!showSettings); }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Personalizar meta"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-2">
        <Progress
          value={progress}
          className={`h-3 rounded-full ${
            goalReached
              ? "[&>div]:bg-primary [&>div]:shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
              : progress >= 60
              ? "[&>div]:bg-primary"
              : "[&>div]:bg-primary/70"
          }`}
        />
        {goalReached && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm"
          >
            <Check className="h-3 w-3 text-primary-foreground" />
          </motion.div>
        )}
      </div>

      {/* XP + Level row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-semibold text-accent">{xp} XP</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary">Nível {level}</span>
          </div>
        </div>
        {goalReached && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] font-bold text-primary"
          >
            {alreadyAwarded ? "✅ Meta cumprida!" : "🎉 +10 XP!"}
          </motion.span>
        )}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
              <label className="text-xs font-medium text-muted-foreground">
                Quantas tarefas por dia?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={newGoal}
                  onChange={(e) => setNewGoal(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="min-w-[2rem] text-center font-heading text-lg font-bold text-foreground">
                  {newGoal}
                </span>
              </div>
              <button
                onClick={handleSave}
                disabled={updateGoal.isPending}
                className="w-full rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Salvar Meta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DailyGoalCard;
