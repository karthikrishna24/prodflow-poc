import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ship, Plus } from "lucide-react";
import { useCreateTeam } from "@/hooks/useTeams";
import { useToast } from "@/hooks/use-toast";

export default function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const createTeam = useCreateTeam();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTeam.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
      });
      setFormData({ name: "", description: "" });
      setOpen(false);
      toast({
        title: "Project created!",
        description: `${formData.name} is ready for voyages.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to create project",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" data-testid="button-create-project">
          <Plus className="h-4 w-4 mr-2" />
          Add New Project
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-create-project">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Set up a new project to organize your releases and deployments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Data Engineering, Full Stack, Mobile App"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-project-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Describe what this project is about..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                data-testid="input-project-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTeam.isPending || !formData.name.trim()}
              data-testid="button-submit-project"
            >
              {createTeam.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

