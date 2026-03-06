import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Crown } from "lucide-react";

const FREE_LIMIT = 10;

export const useFreemiumStatus = () => {
  const { profile } = useAuth();
  const isPremium = profile?.subscription_status === "active";
  const credits = profile?.credits ?? 0;
  const isUnlimited = credits === -1;
  const limitReached = !isPremium && !isUnlimited && credits <= 0;
  return { isPremium, credits, isUnlimited, limitReached, FREE_LIMIT };
};

const FreemiumBar = () => {
  const { isPremium, credits, isUnlimited } = useFreemiumStatus();

  if (isPremium || isUnlimited) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
        <Crown className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold text-primary">Premium</span>
      </div>
    );
  }

  const pct = Math.min(((FREE_LIMIT - credits) / FREE_LIMIT) * 100, 100);
  const isWarning = credits <= 3;
  const isFull = credits <= 0;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20">
        <Progress
          value={pct}
          className={`h-2 ${isFull ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-orange-500" : ""}`}
        />
      </div>
      <span className={`text-[10px] font-medium ${isFull ? "text-destructive" : "text-muted-foreground"}`}>
        {credits}/{FREE_LIMIT}
      </span>
    </div>
  );
};

export default FreemiumBar;
