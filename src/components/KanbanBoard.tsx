import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn, { type CategoryGroup } from "./KanbanColumn";
import { useItens } from "@/hooks/useItens";
import { useCategorias } from "@/hooks/useCategorias";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type { ItemCerebro } from "@/hooks/useItens";

interface KanbanBoardProps {
  activeTab?: "ideias" | "tarefas" | "concluidas";
  limitReached?: boolean;
  onUpgrade?: () => void;
}

function groupByCategory(
  items: ItemCerebro[],
  categorias: { id: string; nome: string; cor: string }[]
): CategoryGroup[] {
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const grouped = new Map<string | null, ItemCerebro[]>();

  for (const item of items) {
    const key = item.categoria_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const groups: CategoryGroup[] = [];

  // Named categories first (sorted by name)
  const catEntries = [...grouped.entries()].filter(([k]) => k !== null);
  catEntries.sort((a, b) => {
    const catA = catMap.get(a[0]!)?.nome || "";
    const catB = catMap.get(b[0]!)?.nome || "";
    return catA.localeCompare(catB);
  });

  for (const [catId, catItems] of catEntries) {
    const cat = catMap.get(catId!);
    groups.push({
      categoryId: catId,
      categoryName: cat?.nome || "Categoria",
      categoryColor: cat?.cor || "#6366f1",
      items: catItems,
    });
  }

  // Uncategorized last
  const uncategorized = grouped.get(null);
  if (uncategorized?.length) {
    groups.push({
      categoryId: null,
      categoryName: "Sem Categoria",
      categoryColor: "#64748b",
      items: uncategorized,
    });
  }

  return groups;
}

const KanbanBoard = ({ activeTab, limitReached, onUpgrade }: KanbanBoardProps) => {
  const { data: items, isLoading, updateStatus, updateTipo } = useItens();
  const { data: categorias, isLoading: catLoading } = useCategorias();

  const tarefaCats = useMemo(
    () => (categorias || []).filter((c) => c.tipo === "tarefa"),
    [categorias]
  );

  const columns = useMemo(() => {
    const all = items || [];
    return {
      ideias: all.filter((i) => i.tipo === "ideia" && i.status !== "concluida"),
      tarefas: all.filter((i) => i.tipo === "tarefa" && i.status === "pendente"),
      concluidas: all.filter((i) => i.status === "concluida"),
    };
  }, [items]);

  const tarefasGroups = useMemo(
    () => groupByCategory(columns.tarefas, tarefaCats),
    [columns.tarefas, tarefaCats]
  );

  const concluidasGroups = useMemo(
    () => groupByCategory(columns.concluidas, tarefaCats),
    [columns.concluidas, tarefaCats]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;

    if (destination.droppableId === "ideias") {
      updateTipo.mutate({ id: draggableId, tipo: "ideia" });
      updateStatus.mutate({ id: draggableId, status: "pendente" });
    } else if (destination.droppableId === "tarefas") {
      updateTipo.mutate({ id: draggableId, tipo: "tarefa" });
      updateStatus.mutate({ id: draggableId, status: "pendente" });
    } else if (destination.droppableId === "concluidas") {
      updateStatus.mutate({
        id: draggableId,
        status: "concluida",
        completed_at: new Date().toISOString(),
      });
    }
  };

  if (isLoading || catLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Mobile: show only active tab column */}
      <div className="block sm:hidden">
        {activeTab === "ideias" && (
          <KanbanColumn id="ideias" title="Ideias Soltas" emoji="💡" items={columns.ideias} />
        )}
        {activeTab === "tarefas" && (
          <KanbanColumn
            id="tarefas"
            title="Tarefas do Dia"
            emoji="📋"
            items={columns.tarefas}
            groups={tarefasGroups}
          />
        )}
        {activeTab === "concluidas" && (
          <KanbanColumn
            id="concluidas"
            title="Concluídas"
            emoji="✅"
            items={columns.concluidas}
            groups={concluidasGroups}
          />
        )}
      </div>

      {/* Desktop: horizontal kanban */}
      <div className="hidden gap-4 sm:flex">
        <KanbanColumn id="ideias" title="Ideias Soltas" emoji="💡" items={columns.ideias} />
        <KanbanColumn
          id="tarefas"
          title="Tarefas do Dia"
          emoji="📋"
          items={columns.tarefas}
          groups={tarefasGroups}
        />
        <KanbanColumn
          id="concluidas"
          title="Concluídas"
          emoji="✅"
          items={columns.concluidas}
          groups={concluidasGroups}
        />
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
