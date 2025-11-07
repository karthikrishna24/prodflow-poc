import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Handle, Position } from "reactflow";
import { CheckCircle2, Circle, Clock, AlertCircle, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  id: string;
  title: string;
  status: "todo" | "doing" | "done" | "na";
  owner?: string;
  required?: boolean;
  priority?: "P1" | "P2" | "P3";
  dueDate?: string;
  evidenceCount?: number;
  onClick?: () => void;
}

const statusConfig = {
  todo: { icon: Circle, label: "To Do", className: "text-muted-foreground" },
  doing: { icon: Clock, label: "In Progress", className: "text-blue-500" },
  done: { icon: CheckCircle2, label: "Done", className: "text-emerald-500" },
  na: { icon: AlertCircle, label: "N/A", className: "text-muted-foreground" },
};

const priorityConfig = {
  P1: { className: "bg-destructive/10 text-destructive" },
  P2: { className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  P3: { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
};

export default function TaskCard({
  id,
  title,
  status,
  owner,
  required,
  priority,
  dueDate,
  evidenceCount,
  onClick,
}: TaskCardProps) {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <Card
        className="p-3 cursor-pointer hover-elevate active-elevate-2 transition-all w-80"
        onClick={onClick}
        data-testid={`card-task-${id}`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <StatusIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", statusInfo.className)} />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2" data-testid={`text-task-title-${id}`}>
                  {title}
                </h4>
              </div>
            </div>
            {required && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                Required
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {owner && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{getInitials(owner)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground" data-testid={`text-owner-${id}`}>{owner}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {priority && (
                <Badge className={cn("text-xs", priorityConfig[priority].className)} data-testid={`badge-priority-${id}`}>
                  {priority}
                </Badge>
              )}
              {evidenceCount !== undefined && evidenceCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  <span data-testid={`text-evidence-count-${id}`}>{evidenceCount}</span>
                </div>
              )}
            </div>
          </div>

          {dueDate && (
            <div className="text-xs text-muted-foreground" data-testid={`text-due-date-${id}`}>
              Due: {dueDate}
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </>
  );
}
