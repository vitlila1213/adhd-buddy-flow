import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import type { ItemCerebro } from "@/hooks/useItens";
import { motion, AnimatePresence } from "framer-motion";

interface KanbanColumnProps {
  id: string;
  title: string;
  items: ItemCerebro[];
  emoji: string;
}

const KanbanColumn = ({ id, title, items, emoji }: KanbanColumnProps) => {
  return (
    <div className="flex min-h-[200px] flex-1 flex-col sm:min-h-[400px]">
      <div className="mb-3 flex items-center gap-2.5 px-1">
        <span className="text-lg">{emoji}</span>
        <h3 className="font-heading text-sm font-bold tracking-tight text-foreground">{title}</h3>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {items.length}
        </span>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-1 flex-col gap-2.5 rounded-2xl p-1 transition-colors duration-200 ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
            }`}
          >
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    layout: { type: "spring", stiffness: 350, damping: 30 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.25 },
                  }}
                >
                  <KanbanCard item={item} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
            {provided.placeholder}
            {items.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-1 flex-col items-center justify-center py-16 sm:py-12"
              >
                <span className="mb-2 text-3xl opacity-30">{emoji}</span>
                <p className="text-sm text-muted-foreground/50">Nenhum item aqui</p>
              </motion.div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
