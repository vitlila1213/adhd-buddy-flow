import { useAuth } from "@/contexts/AuthContext";
import { useItens } from "@/hooks/useItens";
import { Progress } from "@/components/ui/progress";
import { Crown } from "lucide-react";

const FREE_LIMIT = 10;

export const useFreemiumStatus = () => {
  const { profile } = useAuth();
  const { data: items } = useItens();
  const isPremium = profile?.subscription_status === "active";
  const totalItems = items?.length ?? 0;
  const limitReached = !isPremium && totalItems >= FREE_LIMIT;
  return { isPremium, totalItems, limitReached, FREE_LIMIT };
};

const FreemiumBar = () => {
  const { isPremium, totalItems, FREE_LIMIT } = useFreemiumStatus();

  if (isPremium) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
        <Crown className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-primary">Premium</span>
      </div>
    );
  }

  const pct = Math.min((totalItems / FREE_LIMIT) * 100, 100);
  const isWarning = pct >= 70;
  const isFull = pct >= 100;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20">
        <Progress
          value={pct}
          className={`h-2 ${isFull ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-orange-500" : ""}`}
        />
      </div>
      <span className={`text-[10px] font-medium ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
        {totalItems}/{FREE_LIMIT}
      </span>
    </div>
  );
};

export default FreemiumBar;
