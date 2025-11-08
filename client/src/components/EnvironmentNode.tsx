import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface EnvironmentNodeProps {
  id: string;
  name: string;
  env?: string; // Now optional and accepts any string
  status: "not_started" | "in_progress" | "blocked" | "done";
  tasksCompleted: number;
  tasksTotal: number;
  lastUpdate?: string;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

const envConfig: Record<string, { label: string; className: string }> = {
  staging: { label: "Staging", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  uat: { label: "UAT", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  prod: { label: "Production", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  production: { label: "Production", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

// Default environment config for custom environments
const defaultEnvConfig = { label: "Custom", className: "bg-primary/10 text-primary" };

const statusConfig = {
  not_started: { dot: "bg-muted-foreground", label: "Not Started" },
  in_progress: { dot: "bg-blue-500", label: "In Progress" },
  blocked: { dot: "bg-destructive", label: "Blocked" },
  done: { dot: "bg-emerald-500", label: "Done" },
};

export default function EnvironmentNode({
  id,
  name,
  env,
  status,
  tasksCompleted,
  tasksTotal,
  lastUpdate,
  onClick,
  onDelete,
}: EnvironmentNodeProps) {
  // Use the env config if it exists, otherwise use default config
  const envKey = env?.toLowerCase() || "";
  const envInfo = envConfig[envKey] || defaultEnvConfig;
  const statusInfo = statusConfig[status];
  const progress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      <Card
        className="w-60 cursor-pointer hover-elevate active-elevate-2 transition-all overflow-visible"
        onClick={onClick}
        data-testid={`card-environment-${id}`}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge className={cn("text-xs font-medium", envInfo.className)} data-testid={`badge-env-${id}`}>
              {envInfo.label}
            </Badge>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", statusInfo.dot)} />
                <span className="text-xs text-muted-foreground">{statusInfo.label}</span>
              </div>
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}
                  data-testid={`button-delete-env-${id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm" data-testid={`text-env-name-${id}`}>{name}</h3>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tasks</span>
                <span className="font-medium font-mono" data-testid={`text-tasks-${id}`}>
                  {tasksCompleted}/{tasksTotal}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    status === "blocked" ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {lastUpdate && (
            <div className="text-xs text-muted-foreground" data-testid={`text-last-update-${id}`}>
              Updated {lastUpdate}
            </div>
          )}
        </div>
      </Card>
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </>
  );
}
