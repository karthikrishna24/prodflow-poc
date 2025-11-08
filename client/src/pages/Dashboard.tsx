import { useState } from "react";
import ReleaseListPanel from "@/components/ReleaseListPanel";
import EnvironmentFlowCanvas from "@/components/EnvironmentFlowCanvas";
import ThemeToggle from "@/components/ThemeToggle";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Anchor, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
  const { user, logoutMutation } = useAuth();

  const handleReleaseClick = (releaseId: string) => {
    setSelectedRelease(releaseId);
  };

  const handleEnvironmentClick = (envId: string) => {
    if (selectedRelease) {
      setLocation(`/environment/${envId}?releaseId=${selectedRelease}`);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Anchor className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">DockVoyage</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-muted-foreground">
              Captain {user.username}
            </span>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            data-testid="button-logout"
            title="Disembark"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ReleaseListPanel onReleaseClick={handleReleaseClick} />
        <div className="flex-1">
          {selectedRelease ? (
            <EnvironmentFlowCanvas releaseId={selectedRelease} onEnvironmentClick={handleEnvironmentClick} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Anchor className="w-16 h-16 mx-auto text-muted-foreground" />
                <p className="text-lg">Welcome to DockVoyage!</p>
                <p className="text-sm">Select a voyage to chart your deployment course</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
