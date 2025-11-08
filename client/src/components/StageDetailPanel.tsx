import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  X,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StageDetailPanelProps {
  stageId: string | null;
  releaseId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  status: "todo" | "doing" | "done" | "na";
  required?: boolean;
  evidence?: string;
}

interface Blocker {
  id: string;
  reason: string;
  severity: "P1" | "P2" | "P3";
  owner?: string;
  eta?: string;
  active: boolean;
}

interface Stage {
  id: string;
  environmentId: string;
  status: string;
  approver?: string;
  environment?: {
    id: string;
    name: string;
    description?: string;
  };
  tasks?: Task[];
  blockers?: Blocker[];
}

const statusConfig = {
  not_started: { label: "Not Started", icon: Circle, className: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, className: "text-blue-500" },
  blocked: { label: "Blocked", icon: AlertTriangle, className: "text-destructive" },
  done: { label: "Done", icon: CheckCircle2, className: "text-emerald-500" },
};

const taskStatusConfig = {
  todo: { label: "To Do", className: "bg-muted text-muted-foreground" },
  doing: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  done: { label: "Done", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  na: { label: "N/A", className: "bg-muted text-muted-foreground" },
};

const blockerSeverityConfig = {
  P1: { label: "P1 - Critical", className: "bg-destructive/10 text-destructive" },
  P2: { label: "P2 - High", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  P3: { label: "P3 - Medium", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
};

export default function StageDetailPanel({ stageId, releaseId, isOpen, onClose }: StageDetailPanelProps) {
  const { toast } = useToast();
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddBlockerDialogOpen, setIsAddBlockerDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState("");
  const [newBlockerReason, setNewBlockerReason] = useState("");
  const [newBlockerSeverity, setNewBlockerSeverity] = useState<"P1" | "P2" | "P3">("P2");
  const [newBlockerOwner, setNewBlockerOwner] = useState("");

  // Fetch stage details
  const { data: stage, isLoading } = useQuery<Stage>({
    queryKey: ['/api/stages', stageId],
    enabled: !!stageId && isOpen,
  });

  // Add task mutation
  const addTask = useMutation({
    mutationFn: async (data: { title: string; description?: string; owner?: string }) => {
      if (!stageId) throw new Error("No stage selected");
      const response = await apiRequest('POST', `/api/stages/${stageId}/tasks`, {
        ...data,
        status: 'todo',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId] });
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
      setIsAddTaskDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskOwner("");
      toast({
        title: "Task added",
        description: "Task has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update task status mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, { status });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId] });
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add blocker mutation
  const addBlocker = useMutation({
    mutationFn: async (data: { reason: string; severity: string; owner?: string }) => {
      if (!stageId) throw new Error("No stage selected");
      const response = await apiRequest('POST', `/api/stages/${stageId}/blockers`, {
        ...data,
        active: true,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId] });
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
      setIsAddBlockerDialogOpen(false);
      setNewBlockerReason("");
      setNewBlockerOwner("");
      toast({
        title: "Blocker added",
        description: "Blocker has been logged successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add blocker",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resolve blocker mutation
  const resolveBlocker = useMutation({
    mutationFn: async (blockerId: string) => {
      const response = await apiRequest('PATCH', `/api/blockers/${blockerId}`, { active: false });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId] });
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
      toast({
        title: "Blocker resolved",
        description: "Blocker has been marked as resolved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resolve blocker",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask.mutate({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        owner: newTaskOwner.trim() || undefined,
      });
    }
  };

  const handleAddBlocker = () => {
    if (newBlockerReason.trim()) {
      addBlocker.mutate({
        reason: newBlockerReason.trim(),
        severity: newBlockerSeverity,
        owner: newBlockerOwner.trim() || undefined,
      });
    }
  };

  const handleTaskToggle = (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    updateTaskStatus.mutate({ taskId, status: nextStatus });
  };

  if (!stage && !isLoading) return null;

  const statusInfo = statusConfig[stage?.status as keyof typeof statusConfig] || statusConfig.not_started;
  const StatusIcon = statusInfo.icon;
  const tasks = stage?.tasks || [];
  const blockers = (stage?.blockers || []).filter((b: Blocker) => b.active);
  const tasksCompleted = tasks.filter((t: Task) => t.status === 'done').length;
  const tasksTotal = tasks.length;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto" data-testid="sheet-stage-detail">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : stage ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <SheetTitle className="text-2xl">{stage.environment?.name || "Environment"}</SheetTitle>
                  <Badge className={statusInfo.className} data-testid="badge-stage-status">
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </div>
                {stage.environment?.description && (
                  <SheetDescription>{stage.environment.description}</SheetDescription>
                )}
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Progress Stats */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks Completed</p>
                    <p className="text-2xl font-semibold">
                      {tasksCompleted} / {tasksTotal}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Active Blockers</p>
                    <p className="text-2xl font-semibold text-destructive">{blockers.length}</p>
                  </div>
                </div>

                {/* Active Blockers */}
                {blockers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        Active Blockers
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddBlockerDialogOpen(true)}
                        data-testid="button-add-blocker"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Blocker
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {blockers.map((blocker: Blocker) => (
                        <div
                          key={blocker.id}
                          className="p-3 border rounded-md bg-card space-y-2"
                          data-testid={`blocker-${blocker.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Badge className={blockerSeverityConfig[blocker.severity].className}>
                                {blockerSeverityConfig[blocker.severity].label}
                              </Badge>
                              <p className="mt-2 text-sm">{blocker.reason}</p>
                              {blocker.owner && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Owner: {blocker.owner}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => resolveBlocker.mutate(blocker.id)}
                              data-testid={`button-resolve-blocker-${blocker.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Tasks</h3>
                    <Button
                      size="sm"
                      onClick={() => setIsAddTaskDialogOpen(true)}
                      data-testid="button-add-task"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No tasks yet. Add your first task to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map((task: Task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 border rounded-md hover-elevate"
                          data-testid={`task-${task.id}`}
                        >
                          <Checkbox
                            checked={task.status === 'done'}
                            onCheckedChange={() => handleTaskToggle(task.id, task.status)}
                            className="mt-1"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                                {task.required && <span className="text-destructive ml-1">*</span>}
                              </p>
                              <Badge variant="outline" className={taskStatusConfig[task.status].className}>
                                {taskStatusConfig[task.status].label}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                            {task.owner && (
                              <p className="text-xs text-muted-foreground">Assigned to: {task.owner}</p>
                            )}
                            {task.evidence && (
                              <a
                                href={task.evidence}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Evidence
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Add a new task to this environment stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title *</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g., Deploy database migrations"
                data-testid="input-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Additional details about this task..."
                data-testid="input-task-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-owner">Owner</Label>
              <Input
                id="task-owner"
                value={newTaskOwner}
                onChange={(e) => setNewTaskOwner(e.target.value)}
                placeholder="e.g., john@example.com"
                data-testid="input-task-owner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()} data-testid="button-confirm-add-task">
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Blocker Dialog */}
      <Dialog open={isAddBlockerDialogOpen} onOpenChange={setIsAddBlockerDialogOpen}>
        <DialogContent data-testid="dialog-add-blocker">
          <DialogHeader>
            <DialogTitle>Add Blocker</DialogTitle>
            <DialogDescription>
              Log an issue that's blocking progress on this stage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="blocker-reason">Reason *</Label>
              <Textarea
                id="blocker-reason"
                value={newBlockerReason}
                onChange={(e) => setNewBlockerReason(e.target.value)}
                placeholder="Describe the blocker..."
                data-testid="input-blocker-reason"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocker-severity">Severity</Label>
              <div className="flex gap-2">
                {(['P1', 'P2', 'P3'] as const).map((severity) => (
                  <Button
                    key={severity}
                    variant={newBlockerSeverity === severity ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewBlockerSeverity(severity)}
                    data-testid={`button-severity-${severity}`}
                  >
                    {blockerSeverityConfig[severity].label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocker-owner">Owner</Label>
              <Input
                id="blocker-owner"
                value={newBlockerOwner}
                onChange={(e) => setNewBlockerOwner(e.target.value)}
                placeholder="Who's responsible for resolving this?"
                data-testid="input-blocker-owner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBlockerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBlocker} disabled={!newBlockerReason.trim()} data-testid="button-confirm-add-blocker">
              Add Blocker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
