import { Handle, Position } from "reactflow";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, Circle, Clock, Trash2, User } from "lucide-react";

interface TaskNodeProps {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  owner?: string;
  required?: boolean;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, currentStatus: string) => void;
}

const statusConfig = {
  todo: {
    icon: Circle,
    label: "To Do",
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    icon: Clock,
    label: "In Progress",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  done: {
    icon: CheckCircle2,
    label: "Done",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
};

export default function TaskNode({
  id,
  title,
  description,
  status,
  owner,
  required,
  onDelete,
  onToggle,
}: TaskNodeProps) {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  return (
    <div
      className="bg-card border border-border rounded-md shadow-sm min-w-[250px] max-w-[300px]"
      data-testid={`task-node-${id}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      
      <div className="p-3 space-y-2">
        {/* Header with status and actions */}
        <div className="flex items-start justify-between gap-2">
          <Badge className={statusInfo.className} data-testid={`badge-task-status-${id}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
          <div className="flex items-center gap-1">
            {onToggle && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(id, status);
                }}
                data-testid={`button-toggle-task-${id}`}
              >
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this task?")) {
                    onDelete(id);
                  }
                }}
                data-testid={`button-delete-task-${id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h4 className="font-medium text-sm">
            {title}
            {required && <span className="text-destructive ml-1">*</span>}
          </h4>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Owner */}
        {owner && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{owner}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </div>
  );
}
