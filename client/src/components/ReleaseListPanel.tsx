import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReleaseCard from "./ReleaseCard";
import CreateReleaseDialog from "./CreateReleaseDialog";
import { useReleases, useCreateRelease } from "@/hooks/useReleases";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

interface ReleaseListPanelProps {
  onReleaseClick?: (releaseId: string) => void;
}

type FilterStatus = "all" | "ongoing" | "finished" | "failed";

export default function ReleaseListPanel({ onReleaseClick }: ReleaseListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const { data: releases = [], isLoading } = useReleases();
  const createRelease = useCreateRelease();
  const { user } = useAuth();
  
  const filteredReleases = releases.filter((release: any) => {
    const matchesSearch = 
      release.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.version?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === "all") return true;
    
    const releaseStatus = getReleaseStatus(release);
    return releaseStatus === statusFilter;
  });
  
  function getReleaseStatus(release: any): FilterStatus {
    if (!release.stages || release.stages.length === 0) return "ongoing";
    
    const hasBlockers = release.stages.some((s: any) => 
      s.status === "blocked" || (s.blockers && s.blockers.some((b: any) => b.active))
    );
    
    if (hasBlockers) return "failed";
    
    const allDone = release.stages.every((s: any) => s.status === "done");
    if (allDone) return "finished";
    
    return "ongoing";
  }
  
  const handleCreateRelease = async (data: { name: string; version: string; team: string }) => {
    await createRelease.mutateAsync({
      name: data.name,
      version: data.version,
      team: data.team,
      createdBy: user?.username || "system",
    });
  };

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Ongoing", value: "ongoing" },
    { label: "Finished", value: "finished" },
    { label: "Failed", value: "failed" },
  ];

  return (
    <div className="w-80 h-full border-r bg-card flex flex-col">
      <div className="p-4 border-b space-y-4">
        <h2 className="text-lg font-semibold">Active Voyages</h2>
        <CreateReleaseDialog
          onCreateRelease={handleCreateRelease}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search releases..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-releases"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={statusFilter === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(btn.value)}
              data-testid={`button-filter-${btn.value}`}
              className="flex-1"
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading releases...</div>
        ) : filteredReleases.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {searchQuery ? "No releases found" : "No releases yet. Create one to get started!"}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReleases.map((release) => (
              <ReleaseCard
                key={release.id}
                id={release.id}
                name={release.name}
                version={release.version || "No version"}
                status={release.status || "not_started"}
                progress={release.progress || 0}
                updatedAt={release.createdAt ? formatDistanceToNow(new Date(release.createdAt), { addSuffix: true }) : "Unknown"}
                onClick={() => onReleaseClick?.(release.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
