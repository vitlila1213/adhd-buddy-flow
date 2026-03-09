import { useState, useEffect } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSTutorial, setShowIOSTutorial] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSTutorial(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  // Don't show button if already installed
  if (isStandalone) return null;

  // Don't show if not installable (no prompt and not iOS)
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <Button
        onClick={handleInstallClick}
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50"
      >
        <Download className="h-4 w-4" />
        Instalar App
      </Button>

      {/* iOS Tutorial Modal */}
      <AnimatePresence>
        {showIOSTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowIOSTutorial(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
            >
              <button
                onClick={() => setShowIOSTutorial(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Download className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Instalar no iPhone
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Siga os passos abaixo para adicionar o app à tela inicial:
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-4 rounded-xl bg-muted/50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Toque no botão Compartilhar
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Share className="h-4 w-4" />
                      <span>Na barra inferior do Safari</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-muted/50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Selecione "Adicionar à Tela de Início"
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Plus className="h-4 w-4" />
                      <span>Role para baixo no menu</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl bg-muted/50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Toque em "Adicionar"
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No canto superior direito
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIOSTutorial(false)}
                className="mt-6 w-full rounded-xl"
              >
                Entendi!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPWAButton;
