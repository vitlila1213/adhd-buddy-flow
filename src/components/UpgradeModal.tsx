import { Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UpgradeModal = ({ open, onOpenChange }: UpgradeModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="font-heading text-xl font-bold">
            Limite Atingido
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Você usou todas as suas 10 ideias gratuitas. Assine o Premium para
            uso ilimitado do seu segundo cérebro!
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <Button
            className="w-full rounded-xl font-semibold shadow-lg shadow-primary/20"
            onClick={() => {
              onOpenChange(false);
              navigate("/vendas");
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Ver Planos Premium
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
