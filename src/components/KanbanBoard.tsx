import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn, { type CategoryGroup } from "./KanbanColumn";
import { useItens } from "@/hooks/useItens";
import { useCategorias } from "@/hooks/useCategorias";
import { useMemo, useState } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import type { ItemCerebro } from "@/hooks/useItens";
import { format, isSameDay, isSameMonth, isSameYear, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  activeTab?: "anotacoes" | "tarefas" | "concluidas";
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
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  const tarefaCats = useMemo(
    () => (categorias || []).filter((c) => c.tipo === "tarefa"),
    [categorias]
  );

  const filterItems = (list: ItemCerebro[]) => {
    if (!filterDate) return list;
    return list.filter((item) => {
      const itemDate = item.created_at ? new Date(item.created_at) : null;
      if (!itemDate) return false;
      return isSameDay(itemDate, filterDate);
    });
  };

  const columns = useMemo(() => {
    const all = items || [];
    return {
      anotacoes: all.filter((i) => i.tipo === "ideia" && i.status !== "concluida"),
      tarefas: all.filter((i) => i.tipo === "tarefa" && i.status === "pendente"),
      concluidas: all.filter((i) => i.status === "concluida"),
    };
  }, [items]);

  const filteredColumns = useMemo(() => ({
    anotacoes: filterItems(columns.anotacoes),
    tarefas: filterItems(columns.tarefas),
    concluidas: filterItems(columns.concluidas),
  }), [columns, filterDate]);

  const tarefasGroups = useMemo(
    () => groupByCategory(filteredColumns.tarefas, tarefaCats),
    [filteredColumns.tarefas, tarefaCats]
  );

  const concluidasGroups = useMemo(
    () => groupByCategory(filteredColumns.concluidas, tarefaCats),
    [filteredColumns.concluidas, tarefaCats]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;

    if (destination.droppableId === "anotacoes") {
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
      {/* Date filter */}
      <div className="mb-4 flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal text-sm h-9",
                !filterDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDate ? format(filterDate, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filterDate}
              onSelect={setFilterDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        {filterDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterDate(undefined)}
            className="h-9 text-xs text-muted-foreground"
          >
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Mobile: show only active tab column */}
      <div className="block sm:hidden">
        {activeTab === "anotacoes" && (
          <KanbanColumn id="anotacoes" title="Anotações" emoji="📝" items={filteredColumns.anotacoes} />
        )}
        {activeTab === "tarefas" && (
          <KanbanColumn
            id="tarefas"
            title="Tarefas do Dia"
            emoji="📋"
            items={filteredColumns.tarefas}
            groups={tarefasGroups}
          />
        )}
        {activeTab === "concluidas" && (
          <KanbanColumn
            id="concluidas"
            title="Concluídas"
            emoji="✅"
            items={filteredColumns.concluidas}
            groups={concluidasGroups}
          />
        )}
      </div>

      {/* Desktop: horizontal kanban */}
      <div className="hidden gap-4 sm:flex">
        <KanbanColumn id="anotacoes" title="Anotações" emoji="📝" items={filteredColumns.anotacoes} />
        <KanbanColumn
          id="tarefas"
          title="Tarefas do Dia"
          emoji="📋"
          items={filteredColumns.tarefas}
          groups={tarefasGroups}
        />
        <KanbanColumn
          id="concluidas"
          title="Concluídas"
          emoji="✅"
          items={filteredColumns.concluidas}
          groups={concluidasGroups}
        />
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
