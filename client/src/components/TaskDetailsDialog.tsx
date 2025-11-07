import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Clock, Link as LinkIcon } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  owner?: string;
}

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  taskId: string;
}

export default function TaskDetailsDialog({
  open,
  onOpenChange,
  taskTitle,
  taskId,
}: TaskDetailsDialogProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "1", text: "Code review completed", completed: true, owner: "John Doe" },
    { id: "2", text: "Tests passing", completed: true, owner: "Jane Smith" },
    { id: "3", text: "Documentation updated", completed: false, owner: "Bob Johnson" },
  ]);

  const [status, setStatus] = useState("doing");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    console.log(`Toggled checklist item ${id}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid={`dialog-task-details-${taskId}`}>
        <DialogHeader>
          <DialogTitle className="text-lg" data-testid={`text-dialog-title-${taskId}`}>{taskTitle}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="checklist" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="checklist" data-testid="tab-checklist">Checklist</TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-4 mt-4">
            <div className="space-y-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`checklist-item-${item.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                      data-testid={`checkbox-${item.id}`}
                    />
                    <span
                      className={item.completed ? "line-through text-muted-foreground" : ""}
                    >
                      {item.text}
                    </span>
                  </div>
                  {item.owner && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(item.owner)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{item.owner}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="doing">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add task description..."
                  className="min-h-24"
                  data-testid="textarea-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidence">Evidence URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="evidence"
                    placeholder="https://..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    data-testid="input-evidence-url"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => console.log("Add evidence:", evidenceUrl)}
                    data-testid="button-add-evidence"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex gap-3 text-sm" data-testid="activity-item-1">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Status changed to "In Progress"</p>
                  <p className="text-xs text-muted-foreground">John Doe • 2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3 text-sm" data-testid="activity-item-2">
                <div className="flex-shrink-0 mt-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Task created</p>
                  <p className="text-xs text-muted-foreground">Jane Smith • 1 day ago</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close">
            Close
          </Button>
          <Button onClick={() => {
            console.log("Saved task changes");
            onOpenChange(false);
          }} data-testid="button-save">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
