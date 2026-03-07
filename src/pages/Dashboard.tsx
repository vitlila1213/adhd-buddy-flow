import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import KanbanBoard from "@/components/KanbanBoard";
import MetricasDoDia from "@/components/MetricasDoDia";
import FinancasTab from "@/components/FinancasTab";
import CategoriasTab from "@/components/CategoriasTab";
import WhatsAppOnboardingModal from "@/components/WhatsAppOnboardingModal";
import FreemiumBar from "@/components/FreemiumBar";
import UpgradeModal from "@/components/UpgradeModal";
import { useFreemiumStatus } from "@/components/FreemiumBar";
import { Brain, LogOut, ListTodo, DollarSign, Settings, BarChart3, Cake } from "lucide-react";
import AniversariantesTab from "@/components/AniversariantesTab";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "tarefas" | "financas" | "categorias" | "aniversariantes" | "metricas";

const tabs = [
  { id: "tarefas" as Tab, label: "Tarefas", icon: ListTodo, emoji: "🧠" },
  { id: "financas" as Tab, label: "Finanças", icon: DollarSign, emoji: "💰" },
  { id: "aniversariantes" as Tab, label: "Aniversários", icon: Cake, emoji: "🎂" },
  { id: "categorias" as Tab, label: "Categorias", icon: Settings, emoji: "⚙️" },
  { id: "metricas" as Tab, label: "Métricas", icon: BarChart3, emoji: "📊" },
];

const Dashboard = () => {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("tarefas");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { limitReached } = useFreemiumStatus();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WhatsAppOnboardingModal />
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />

      {/* Header */}
      <header className="glass fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-base font-bold tracking-tight text-foreground">
                Cérebro de Bolso
              </h1>
              <p className="text-[11px] text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FreemiumBar />
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-24 pt-[72px] sm:px-6">
        <div className="mx-auto max-w-2xl lg:max-w-6xl">
          {/* Desktop tabs */}
          <div className="mb-5 hidden pt-4 sm:block">
            <div className="flex gap-1 rounded-2xl bg-muted/60 p-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="sm:pt-0 pt-4"
            >
              {activeTab === "metricas" && <MetricasDoDia />}
              {activeTab === "financas" && <FinancasTab />}
              {activeTab === "aniversariantes" && <AniversariantesTab />}
              {activeTab === "categorias" && <CategoriasTab />}
              {activeTab === "tarefas" && (
                <KanbanBoard activeTab="tarefas" limitReached={limitReached} onUpgrade={() => setShowUpgrade(true)} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-50 sm:hidden safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNav"
                    className="mt-0.5 h-1 w-5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
