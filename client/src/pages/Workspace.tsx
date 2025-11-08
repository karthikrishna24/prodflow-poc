import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTeams, useDeleteTeam } from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Anchor, LogOut, Users, FolderKanban, Plus, Ship, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import CreateProjectDialog from "@/components/CreateProjectDialog";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Workspace() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { data: teams = [], isLoading } = useTeams();
  const deleteTeam = useDeleteTeam();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleProjectClick = (projectId: string) => {
    setLocation(`/project/${projectId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      await deleteTeam.mutateAsync(projectToDelete);
      toast({
        title: "Project deleted",
        description: "The project has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error: any) {
      toast({
        title: "Failed to delete project",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/team")}
            data-testid="button-team"
            title="Manage Crew"
          >
            <Users className="h-4 w-4" />
          </Button>
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

      <div className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Your Projects</h2>
            <p className="text-muted-foreground">
              Select a project to view its voyages, or create a new project to get started
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading projects...
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first project to start organizing your releases and deployments
                </p>
                <CreateProjectDialog />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <CreateProjectDialog />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                    onClick={() => handleProjectClick(team.id)}
                    data-testid={`project-card-${team.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Ship className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            {team.description && (
                              <CardDescription className="mt-1">
                                {team.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDeleteClick(e, team.id)}
                          data-testid={`delete-project-${team.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(team.createdAt), { addSuffix: true })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the project
                      and all its voyages, releases, and associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteConfirm}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteTeam.isPending}
                    >
                      {deleteTeam.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

