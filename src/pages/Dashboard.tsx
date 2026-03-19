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
import { Brain, LogOut, ListTodo, DollarSign, Settings, BarChart3, Cake, Link2 } from "lucide-react";
import AniversariantesTab from "@/components/AniversariantesTab";
import IntegracoesTab from "@/components/IntegracoesTab";
import { motion, AnimatePresence } from "framer-motion";
import logoImg from "@/assets/logo.png";
import XpBadge from "@/components/XpBadge";

type Tab = "tarefas" | "financas" | "categorias" | "aniversariantes" | "metricas" | "integracoes" | "anotacoes";

const tabs = [
{ id: "metricas" as Tab, label: "Métricas", icon: BarChart3, emoji: "📊", center: false },
{ id: "financas" as Tab, label: "Finanças", icon: DollarSign, emoji: "💰", center: false },
{ id: "tarefas" as Tab, label: "Tarefas", icon: ListTodo, emoji: "🧠", center: false },
{ id: "anotacoes" as Tab, label: "Cérebro", icon: Brain, emoji: "🧠", center: true },
{ id: "aniversariantes" as Tab, label: "Aniversários", icon: Cake, emoji: "🎂", center: false },
{ id: "categorias" as Tab, label: "Categorias", icon: Settings, emoji: "⚙️", center: false },
{ id: "integracoes" as Tab, label: "Integrações", icon: Link2, emoji: "🔗", center: false }];


const Dashboard = () => {
  const { profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("metricas");
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
            <img alt="Cérebro de Bolso" className="h-12 w-12 rounded-xl object-contain" src="/lovable-uploads/38c5cf7c-f0df-413d-a93a-8b7229fd8845.png" />
            <div>
              <h1 className="font-heading text-base font-bold tracking-tight text-foreground">
                Cérebro de Bolso
              </h1>
              <p className="text-[11px] text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XpBadge />
            <FreemiumBar />
            <button
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Sair">
              
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
            <div className="flex gap-1 rounded-2xl bg-navy/5 p-1.5 border border-border/50">
              {tabs.map((tab) =>
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id ?
                "bg-primary text-primary-foreground shadow-sm shadow-primary/20" :
                "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`
                }>
                
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="sm:pt-0 pt-4">
              
              {activeTab === "metricas" && <MetricasDoDia />}
              {activeTab === "financas" && <FinancasTab />}
              {activeTab === "aniversariantes" && <AniversariantesTab />}
              {activeTab === "categorias" && <CategoriasTab />}
              {activeTab === "integracoes" && <IntegracoesTab />}
              {activeTab === "tarefas" &&
              <KanbanBoard activeTab="tarefas" limitReached={limitReached} onUpgrade={() => setShowUpgrade(true)} />
              }
              {activeTab === "anotacoes" &&
              <KanbanBoard activeTab="anotacoes" limitReached={limitReached} onUpgrade={() => setShowUpgrade(true)} />
              }
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-50 sm:hidden safe-bottom">
        <div className="grid grid-cols-7 items-end pb-1.5 pt-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            if (tab.center) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex flex-col items-center"
                  style={{ marginBottom: '0px' }}>
                  
                  <motion.div
                    className={`-mt-7 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors duration-200 ${
                    isActive ?
                    "bg-primary shadow-primary/30" :
                    "bg-card border border-border shadow-md"}`
                    }
                    animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={isActive ? { duration: 0.4, ease: "easeInOut" } : {}}
                    whileTap={{ scale: 0.9 }}>
                    
                    <motion.div
                      animate={isActive ? { rotate: [0, -10, 10, -5, 5, 0] } : { rotate: 0 }}
                      transition={isActive ? { duration: 0.6, ease: "easeInOut" } : {}}>
                      
                      <tab.icon
                        className={`h-7 w-7 ${
                        isActive ? "text-primary-foreground stroke-[2.5]" : "text-muted-foreground"}`
                        } />
                      
                    </motion.div>
                  </motion.div>
                  <span
                    className={`mt-1 text-[9px] font-medium leading-none ${
                    isActive ? "font-semibold text-primary" : "text-muted-foreground"}`
                    }>
                    
                    {tab.label}
                  </span>
                </button>);

            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-0.5 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"}`
                }>
                
                <tab.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className={`truncate text-[9px] font-medium leading-none ${isActive ? "font-semibold" : ""}`}>
                  {tab.label}
                </span>
                {isActive &&
                <motion.div
                  layoutId="bottomNav"
                  className="mt-0.5 h-1 w-4 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} />

                }
              </button>);

          })}
        </div>
      </nav>
    </div>);

};

export default Dashboard;