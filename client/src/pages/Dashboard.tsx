import { useState } from "react";
import ReleaseListPanel from "@/components/ReleaseListPanel";
import EnvironmentFlowCanvas from "@/components/EnvironmentFlowCanvas";
import ThemeToggle from "@/components/ThemeToggle";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedRelease, setSelectedRelease] = useState<string | null>("1");

  const handleReleaseClick = (releaseId: string) => {
    setSelectedRelease(releaseId);
    console.log("Selected release:", releaseId);
  };

  const handleEnvironmentClick = (envId: string) => {
    console.log("Opening environment:", envId);
    if (selectedRelease) {
      setLocation(`/environment/${envId}?releaseId=${selectedRelease}`);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Release Manager</h1>
          {selectedRelease && (
            <span className="text-sm text-muted-foreground">
              / Release 2025.11.07
            </span>
          )}
        </div>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ReleaseListPanel onReleaseClick={handleReleaseClick} />
        <div className="flex-1">
          {selectedRelease ? (
            <EnvironmentFlowCanvas releaseId={selectedRelease} onEnvironmentClick={handleEnvironmentClick} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select a release to view environments
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
