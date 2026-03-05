import { useState } from "react";
import { usePhoneAuth } from "@/contexts/PhoneAuthContext";
import KanbanBoard from "@/components/KanbanBoard";
import MetricasDoDia from "@/components/MetricasDoDia";
import { Brain, LogOut, LayoutGrid, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "kanban" | "metricas";

const Dashboard = () => {
  const { phone, logout } = usePhoneAuth();
  const [activeTab, setActiveTab] = useState<Tab>("kanban");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-base font-bold text-foreground">Cérebro de Bolso</h1>
              <p className="text-xs text-muted-foreground">{phone}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "kanban"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </button>
          <button
            onClick={() => setActiveTab("metricas")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "metricas"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Métricas do Dia
          </button>
        </div>

        {/* Content */}
        <div className="animate-fade-in">
          {activeTab === "kanban" ? <KanbanBoard /> : <MetricasDoDia />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
