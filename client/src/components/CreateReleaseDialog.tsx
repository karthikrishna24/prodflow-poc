import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ship } from "lucide-react";

interface CreateReleaseDialogProps {
  onCreateRelease?: (data: { name: string; version: string; team: string }) => void;
}

export default function CreateReleaseDialog({ onCreateRelease }: CreateReleaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    version: "",
    team: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRelease?.(formData);
    setFormData({ name: "", version: "", team: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" data-testid="button-create-release">
          <Ship className="h-4 w-4 mr-2" />
          Launch New Voyage
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-create-release">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Launch New Voyage</DialogTitle>
            <DialogDescription>
              Chart a new deployment journey across your environments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Voyage Name</Label>
              <Input
                id="name"
                placeholder="e.g., Q4 Product Launch"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-release-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Cargo Version</Label>
              <Input
                id="version"
                placeholder="e.g., v2.5.0"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                required
                data-testid="input-version"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Crew</Label>
              <Input
                id="team"
                placeholder="e.g., Platform Team"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                required
                data-testid="input-team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" data-testid="button-submit">
              Set Sail
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
