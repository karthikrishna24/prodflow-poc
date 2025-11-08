import { useCallback, useMemo, useState, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import TaskNode from "./TaskNode";
import { Button } from "./ui/button";
import { Plus, Save, ArrowLeft } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const nodeTypes = {
  task: ({ data }: any) => (
    <TaskNode
      id={data.id}
      title={data.title}
      description={data.description}
      status={data.status}
      owner={data.owner}
      required={data.required}
      onDelete={data.onDelete}
      onToggle={data.onToggle}
    />
  ),
};

interface TaskFlowCanvasProps {
  releaseId: string;
  stageId: string;
  environmentName: string;
  onBack: () => void;
}

export default function TaskFlowCanvas({ releaseId, stageId, environmentName, onBack }: TaskFlowCanvasProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch stage data including tasks
  const { data: stage } = useQuery<any>({
    queryKey: ['/api/stages', stageId],
    enabled: !!stageId,
  });

  // Fetch saved diagram layout for tasks
  const { data: diagram } = useQuery<{ layout?: { nodes?: any[]; edges?: any[] } }>({
    queryKey: ['/api/stages', stageId, 'task-diagram'],
    enabled: !!stageId,
  });

  const tasks = useMemo(() => {
    return stage?.tasks || [];
  }, [stage]);

  // Handler functions (defined early to use in initialNodes)
  const handleDeleteTask = useCallback((taskId: string) => {
    fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
      credentials: "include",
    }).then((response) => {
      if (response.ok) {
        toast({
          title: "Task deleted",
          description: "Task has been removed successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId] });
      }
    });
  }, [stageId, toast]);

  const handleToggleTask = useCallback((taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : currentStatus === "todo" ? "in_progress" : "done";
    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
      credentials: "include",
    }).then((response) => {
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId] });
      }
    });
  }, [stageId]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync nodes and edges with tasks and diagram data
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      // If there are no tasks, clear only when there are no local unsaved changes
      if (!hasUnsavedChanges) {
        setNodes([]);
        setEdges([]);
      }
      return;
    }

    // Check if we have saved diagram positions
    const savedNodes = diagram?.layout?.nodes;
    const savedEdges = diagram?.layout?.edges;

    if (savedNodes && savedNodes.length > 0) {
      // Use saved positions and update with current task data
      const updatedNodes = savedNodes.map((savedNode: any) => {
        const task = tasks.find((t: any) => t.id === savedNode.id);
        if (task) {
          return {
            ...savedNode,
            data: {
              ...savedNode.data,
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              owner: task.owner,
              required: task.required,
              onDelete: handleDeleteTask,
              onToggle: handleToggleTask,
            },
          };
        }
        return savedNode;
      }).filter((node: any) => {
        // Remove nodes for tasks that no longer exist
        return tasks.some((t: any) => t.id === node.id);
      });

      // Add nodes for new tasks that weren't in saved diagram
      const existingTaskIds = new Set(updatedNodes.map((n: any) => n.id));
      const newTaskNodes = tasks
        .filter((task: any) => !existingTaskIds.has(task.id))
        .map((task: any, index: number) => ({
          id: task.id,
          type: "task",
          position: { x: 100 + (index % 3) * 350, y: 100 + Math.floor(index / 3) * 200 },
          data: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            owner: task.owner,
            required: task.required,
            onDelete: handleDeleteTask,
            onToggle: handleToggleTask,
          },
        }));

      // Apply server-supplied layout only if there are no local unsaved changes.
      setNodes((prev) => {
        return !hasUnsavedChanges ? [...updatedNodes, ...newTaskNodes] : prev.length ? prev : [...updatedNodes, ...newTaskNodes];
      });
      setEdges((prev) => (!hasUnsavedChanges ? (savedEdges || []) : prev));
    } else {
      // Strictly use saved layout with aggressive preservation
      const savedLayout = diagram?.layout;
      const savedNodes = savedLayout?.nodes || [];

      const newNodes = tasks.map((task: any, index: number) => {
        // Use exact saved position, with minimal predictable fallback
        const savedNode = savedNodes.find((n: any) => n.id === task.id);
        const position = savedNode?.position || { 
          x: Math.random() * 800,  // Random initial position within 800x600 area
          y: Math.random() * 600 
        };

        return {
          id: task.id,
          type: "task",
          position: { 
            x: position.x, 
            y: position.y 
          },
          draggable: true,
          selectable: true,
          connectable: true,
          data: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            owner: task.owner,
            required: task.required,
            onDelete: handleDeleteTask,
            onToggle: handleToggleTask,
          },
        };
      });
      
      setNodes((prev) => (!hasUnsavedChanges ? newNodes : prev.length ? prev : newNodes));
      setEdges((prev) => (!hasUnsavedChanges ? [] : prev));
    }
  }, [tasks, diagram, handleDeleteTask, handleToggleTask]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      setHasUnsavedChanges(true);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      setHasUnsavedChanges(true);
    },
    [onEdgesChange]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      );
      setHasUnsavedChanges(true);
    },
    [setEdges]
  );

  // Save diagram mutation
  const saveDiagram = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/stages/${stageId}/task-diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: {
            nodes: nodes.map((node) => ({
              id: node.id,
              position: {
                x: node.position.x || 0,  // Explicitly preserve exact x position
                y: node.position.y || 0,  // Explicitly preserve exact y position
              },
              data: {
                id: node.data.id,
                title: node.data.title,
                description: node.data.description,
                status: node.data.status,
                owner: node.data.owner,
                required: node.data.required,
              },
            })),
            edges,
          },
          preserveLayout: true  // New flag to indicate strict layout preservation
        }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to save diagram");
      return response.json();
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({
        title: "Layout saved",
        description: "Task canvas layout has been saved exactly as positioned.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId, 'task-diagram'] });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Could not save the task canvas layout.",
        variant: "destructive",
      });
    },
  });

  // Add task mutation
  const addTask = useMutation({
    mutationFn: async (newTask: { title: string; description?: string; owner?: string }) => {
      // server route expects POST /api/stages/:stageId/tasks
      const url = `/api/stages/${stageId}/tasks`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to add task");
      return response.json();
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskOwner("");
      toast({
        title: "Task added",
        description: "New task has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stages', stageId] });
    },
    onError: () => {
      toast({
        title: "Failed to add task",
        description: "Could not create the task.",
        variant: "destructive",
      });
    },
  });


  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    
    addTask.mutate({
      title: newTaskTitle,
      description: newTaskDescription || undefined,
      owner: newTaskOwner || undefined,
    });
  };

  return (
    <>
      <div className="w-full h-full bg-background flex flex-col" data-testid="task-flow-canvas">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              data-testid="button-back-to-release"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{environmentName}</h2>
              <p className="text-sm text-muted-foreground">Task Flow</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-task"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
            {hasUnsavedChanges && (
              <Button
                size="sm"
                variant="default"
                onClick={() => saveDiagram.mutate()}
                disabled={saveDiagram.isPending}
                data-testid="button-save-task-layout"
              >
                <Save className="h-4 w-4 mr-1" />
                {saveDiagram.isPending ? "Saving..." : "Save Layout"}
              </Button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            snapToGrid={false}
            snapGrid={[1, 1]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.1}
            maxZoom={3}
            nodeOrigin={[0, 0]}
            panOnScroll
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            fitView={false}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Create a new task for this environment stage
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTaskTitle.trim() && !e.shiftKey) {
                    handleAddTask();
                  }
                }}
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim() || addTask.isPending} data-testid="button-confirm-add-task">
              {addTask.isPending ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
