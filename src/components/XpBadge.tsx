import { useGamification } from "@/hooks/useGamification";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";

const XpBadge = () => {
  const { xp, level, goalReached } = useGamification();

  return (
    <motion.div
      className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1"
      animate={goalReached ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      <Zap className="h-3.5 w-3.5 text-primary" />
      <span className="text-[11px] font-semibold text-primary">
        {xp} XP
      </span>
    </motion.div>
  );
};

export default XpBadge;
