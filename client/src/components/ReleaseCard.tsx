import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReleaseCardProps {
  id: string;
  name: string;
  version: string;
  status: "not_started" | "in_progress" | "blocked" | "done";
  progress: number;
  updatedAt: string;
  onClick?: () => void;
}

const statusConfig = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-primary/10 text-primary" },
  blocked: { label: "Blocked", className: "bg-destructive/10 text-destructive" },
  done: { label: "Done", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

export default function ReleaseCard({
  id,
  name,
  version,
  status,
  progress,
  updatedAt,
  onClick,
}: ReleaseCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card
      className="p-4 cursor-pointer hover-elevate active-elevate-2 transition-all"
      onClick={onClick}
      data-testid={`card-release-${id}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-release-name-${id}`}>
              {name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              <span className="font-mono" data-testid={`text-version-${id}`}>{version}</span>
            </div>
          </div>
          <Badge className={cn("text-xs", statusInfo.className)} data-testid={`badge-status-${id}`}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium" data-testid={`text-progress-${id}`}>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span data-testid={`text-updated-${id}`}>{updatedAt}</span>
        </div>
      </div>
    </Card>
  );
}
