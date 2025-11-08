import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReleaseCard from "./ReleaseCard";
import CreateReleaseDialog from "./CreateReleaseDialog";
import { useReleases, useCreateRelease, useDeleteRelease } from "@/hooks/useReleases";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ReleaseListPanelProps {
  projectId: string;
  onReleaseClick?: (releaseId: string) => void;
}

type FilterStatus = "all" | "ongoing" | "finished" | "failed";

export default function ReleaseListPanel({ projectId, onReleaseClick }: ReleaseListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const { data: releases = [], isLoading } = useReleases(projectId);
  const createRelease = useCreateRelease();
  const deleteRelease = useDeleteRelease();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<string | null>(null);
  
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
      teamId: projectId, // Use the projectId from props, changed to teamId
      createdBy: user?.username || "system",
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, releaseId: string) => {
    e.stopPropagation();
    setReleaseToDelete(releaseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!releaseToDelete) return;
    try {
      await deleteRelease.mutateAsync(releaseToDelete);
      toast({
        title: "Voyage deleted",
        description: "The voyage has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setReleaseToDelete(null);
    } catch (error: any) {
      toast({
        title: "Failed to delete voyage",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
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
              <div key={release.id} className="relative group">
                <ReleaseCard
                  id={release.id}
                  name={release.name}
                  version={release.version || "No version"}
                  status={release.status || "not_started"}
                  progress={release.progress || 0}
                  updatedAt={release.createdAt ? formatDistanceToNow(new Date(release.createdAt), { addSuffix: true }) : "Unknown"}
                  onClick={() => onReleaseClick?.(release.id)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={(e) => handleDeleteClick(e, release.id)}
                  data-testid={`delete-release-${release.id}`}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Voyage?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the voyage
                  and all its stages, tasks, and associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteRelease.isPending}
                >
                  {deleteRelease.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
