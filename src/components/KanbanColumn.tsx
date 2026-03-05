import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import type { ItemCerebro } from "@/hooks/useItens";

interface KanbanColumnProps {
  id: string;
  title: string;
  items: ItemCerebro[];
  emoji: string;
}

const KanbanColumn = ({ id, title, items, emoji }: KanbanColumnProps) => {
  return (
    <div className="flex min-h-[300px] flex-1 flex-col rounded-xl bg-muted/50 p-3">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="text-lg">{emoji}</span>
        <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
            }`}
          >
            {items.map((item, index) => (
              <KanbanCard key={item.id} item={item} index={index} />
            ))}
            {provided.placeholder}
            {items.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-xs text-muted-foreground/60">Nenhum item aqui</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
