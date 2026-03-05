import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import { useItens } from "@/hooks/useItens";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

const KanbanBoard = () => {
  const { data: items, isLoading, updateStatus, updateTipo } = useItens();

  const columns = useMemo(() => {
    const all = items || [];
    return {
      ideias: all.filter((i) => i.tipo === "ideia" && i.status !== "concluida"),
      tarefas: all.filter((i) => i.tipo === "tarefa" && i.status === "pendente"),
      concluidas: all.filter((i) => i.status === "concluida"),
    };
  }, [items]);

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
      updateStatus.mutate({ id: draggableId, status: "concluida" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        <KanbanColumn id="ideias" title="Ideias Soltas" emoji="💡" items={columns.ideias} />
        <KanbanColumn id="tarefas" title="Tarefas do Dia" emoji="📋" items={columns.tarefas} />
        <KanbanColumn id="concluidas" title="Concluídas" emoji="✅" items={columns.concluidas} />
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
