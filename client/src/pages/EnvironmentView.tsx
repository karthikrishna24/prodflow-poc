import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import TaskFlowCanvas from "@/components/TaskFlowCanvas";
import ThemeToggle from "@/components/ThemeToggle";
import { useRelease } from "@/hooks/useReleases";

const envConfig = {
  staging: { label: "Staging", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  uat: { label: "UAT", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  prod: { label: "Production", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

export default function EnvironmentView() {
  const [, params] = useRoute("/environment/:envId");
  const [, setLocation] = useLocation();
  const envId = params?.envId as "staging" | "uat" | "prod";
  const envInfo = envId ? envConfig[envId] : null;
  
  // Get releaseId from URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const releaseId = searchParams.get("releaseId") || "1"; // Default for now
  const { data: release } = useRelease(releaseId);

  if (!envId || !envInfo) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Environment not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{release?.name || "Release"}</h1>
            <span className="text-muted-foreground">/</span>
            <Badge className={envInfo.className} data-testid="badge-env-header">
              {envInfo.label}
            </Badge>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex-1 overflow-hidden">
        <TaskFlowCanvas releaseId={releaseId} envId={envId} environmentName={envInfo.label} />
      </div>
    </div>
  );
}
