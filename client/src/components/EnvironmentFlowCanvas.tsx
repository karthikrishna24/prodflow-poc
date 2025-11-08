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
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import EnvironmentNode from "./EnvironmentNode";
import { useRelease } from "@/hooks/useReleases";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./ui/button";
import { Plus, Save } from "lucide-react";
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
  environment: ({ data }: any) => (
    <EnvironmentNode
      id={data.id}
      name={data.name}
      env={data.env}
      status={data.status}
      tasksCompleted={data.tasksCompleted}
      tasksTotal={data.tasksTotal}
      lastUpdate={data.lastUpdate}
      onClick={data.onClick}
      onDelete={data.onDelete}
    />
  ),
};

interface EnvironmentFlowCanvasProps {
  releaseId: string | null;
  onEnvironmentClick?: (stageId: string) => void;
}

export default function EnvironmentFlowCanvas({ releaseId, onEnvironmentClick }: EnvironmentFlowCanvasProps) {
  const { data: release, isLoading } = useRelease(releaseId);
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvDescription, setNewEnvDescription] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch saved diagram layout
  const { data: diagram } = useQuery<{ layout?: { nodes?: any[]; edges?: any[] } }>({
    queryKey: ['/api/releases', releaseId, 'diagram'],
    enabled: !!releaseId,
  });

  const environments = useMemo(() => {
    if (!release?.stages) return [];
    
    return release.stages.map((stage: any) => {
      const environment = stage.environment || { id: stage.environmentId, name: "Unknown" };
      const tasks = stage.tasks || [];
      const tasksCompleted = tasks.filter((t: any) => t.status === "done").length;
      const tasksTotal = tasks.length;
      
      return {
        id: stage.id,
        environmentId: stage.environmentId,
        name: environment.name,
        tasksCompleted,
        tasksTotal,
        lastUpdate: stage.lastUpdate 
          ? formatDistanceToNow(new Date(stage.lastUpdate), { addSuffix: true })
          : "Never",
        status: stage.status || "not_started",
        blockers: stage.blockers || [],
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [release]);

  const initialNodes: Node[] = useMemo(() => {
    if (environments.length === 0) return [];
    
    // Check if we have saved layout
    const savedLayout = diagram?.layout;
    const savedNodes = savedLayout?.nodes || [];
    
    const nodeSpacing = 320;
    const startX = 150;
    const centerY = 250;

    return environments.map((env, index) => {
      // Try to find saved position for this node
      const savedNode = savedNodes.find((n: any) => n.id === env.id);
      const position = savedNode?.position || { 
        x: startX + (index * nodeSpacing), 
        y: centerY 
      };

      return {
        id: env.id,
        type: "environment",
        position,
        data: {
          id: env.id,
          environmentId: env.environmentId,
          name: env.name,
          env: env.name.toLowerCase(), // Use environment name as env type
          status: env.status,
          tasksCompleted: env.tasksCompleted,
          tasksTotal: env.tasksTotal,
          lastUpdate: env.lastUpdate,
          blockers: env.blockers,
          onClick: () => onEnvironmentClick?.(env.id),
          onDelete: () => handleDeleteEnvironment(env.id),
        },
      };
    });
  }, [environments, diagram, onEnvironmentClick]);

  const initialEdges: Edge[] = useMemo(() => {
    // Check if we have saved edges
    const savedLayout = diagram?.layout;
    if (savedLayout?.edges && savedLayout.edges.length > 0) {
      return savedLayout.edges.map((edge: any) => ({
        ...edge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.style?.stroke || "hsl(var(--primary))",
        },
      }));
    }

    // Default: create linear flow
    return environments.slice(0, -1).map((env, index) => {
      const nextEnv = environments[index + 1];
      const isCompleted = env.tasksCompleted === env.tasksTotal;
      
      return {
        id: `${env.id}-${nextEnv.id}`,
        source: env.id,
        target: nextEnv.id,
        type: "straight",
        animated: env.status === "done",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: env.status === "done" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        },
        style: { 
          stroke: env.status === "done" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", 
          strokeWidth: 3,
        },
      };
    });
  }, [environments, diagram]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initial nodes change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when initial edges change
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Auto-save with debounce when changes occur
  useEffect(() => {
    if (!hasUnsavedChanges || !releaseId) return;

    const timeoutId = setTimeout(() => {
      saveDiagram.mutate();
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [hasUnsavedChanges, nodes, edges, releaseId]);

  // Handle node position changes
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    // Check if any position changed
    const hasPositionChange = changes.some(
      (change) => change.type === 'position' && change.dragging === false
    );
    if (hasPositionChange) {
      setHasUnsavedChanges(true);
    }
  }, [onNodesChange]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    const hasEdgeChange = changes.some((change) => change.type === 'remove');
    if (hasEdgeChange) {
      setHasUnsavedChanges(true);
    }
  }, [onEdgesChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: "straight",
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "hsl(var(--primary))",
        },
        style: { 
          stroke: "hsl(var(--primary))", 
          strokeWidth: 3,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges]
  );

  // Save layout mutation
  const saveDiagram = useMutation({
    mutationFn: async () => {
      if (!releaseId) throw new Error("No release selected");
      
      const layout = {
        nodes: nodes.map(node => ({
          id: node.id,
          position: node.position,
          type: node.type,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          animated: edge.animated,
          style: edge.style,
        })),
      };

      const response = await apiRequest('PUT', `/api/releases/${releaseId}/diagram`, { layout });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId, 'diagram'] });
      setHasUnsavedChanges(false);
      toast({
        title: "Layout saved",
        description: "Your canvas layout has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save layout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add environment mutation
  const addEnvironment = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!releaseId) throw new Error("No release selected");
      if (!release) throw new Error("Release data not loaded");
      
      const teamId = release.teamId || release.team;
      if (!teamId) {
        console.error("Release object:", release);
        throw new Error("No team associated with release");
      }

      // First create the environment
      const envResponse = await apiRequest('POST', `/api/teams/${teamId}/environments`, { 
        name,
        description,
        sortOrder: String(environments.length),
      });
      const env = await envResponse.json();

      // Then create a stage for this environment in the current release
      const stageResponse = await apiRequest('POST', `/api/releases/${releaseId}/stages`, {
        environmentId: env.id,
        status: 'not_started',
      });
      const stage = await stageResponse.json();

      return stage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
      setIsAddDialogOpen(false);
      setNewEnvName("");
      setNewEnvDescription("");
      toast({
        title: "Environment added",
        description: "New environment has been added to the canvas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add environment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddEnvironment = () => {
    if (newEnvName.trim()) {
      addEnvironment.mutate({ 
        name: newEnvName.trim(), 
        description: newEnvDescription.trim() || undefined 
      });
    }
  };

  // Delete environment mutation
  const deleteEnvironment = useMutation({
    mutationFn: async (environmentId: string) => {
      // Find the stage associated with this environment in the current release
      const stage = environments.find((env: any) => env.id === environmentId);
      if (!stage) throw new Error("Environment not found in this release");
      
      // Delete the environment (cascade will delete all stages)
      await apiRequest('DELETE', `/api/environments/${stage.environmentId}`);
      return environmentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
      toast({
        title: "Environment deleted",
        description: "Environment has been removed from all releases.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete environment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteEnvironment = (environmentId: string) => {
    if (confirm("Are you sure you want to delete this environment? This will remove it from all releases.")) {
      deleteEnvironment.mutate(environmentId);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center" data-testid="environment-flow-canvas">
        <div className="text-muted-foreground">Loading environments...</div>
      </div>
    );
  }

  if (!releaseId) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center" data-testid="environment-flow-canvas">
        <div className="text-muted-foreground">Select a voyage to view the flow</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full bg-background" data-testid="environment-flow-canvas">
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
          fitView
          minZoom={0.3}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <Panel position="top-right" className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-environment"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Environment
            </Button>
            {hasUnsavedChanges && (
              <Button
                size="sm"
                variant="default"
                onClick={() => saveDiagram.mutate()}
                disabled={saveDiagram.isPending}
                data-testid="button-save-layout"
              >
                <Save className="h-4 w-4 mr-1" />
                {saveDiagram.isPending ? "Saving..." : "Save Layout"}
              </Button>
            )}
          </Panel>
        </ReactFlow>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Environment</DialogTitle>
            <DialogDescription>
              Create a new environment stage for this voyage. You can position it on the canvas and connect it to other environments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="env-name">Environment Name</Label>
              <Input
                id="env-name"
                placeholder="e.g., Staging, UAT, Production"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newEnvName.trim() && !e.shiftKey) {
                    handleAddEnvironment();
                  }
                }}
                data-testid="input-environment-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="env-description">Description (Optional)</Label>
              <Textarea
                id="env-description"
                placeholder="Brief description of this environment's purpose"
                value={newEnvDescription}
                onChange={(e) => setNewEnvDescription(e.target.value)}
                rows={3}
                data-testid="input-environment-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewEnvName("");
                setNewEnvDescription("");
              }}
              data-testid="button-cancel-add-environment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEnvironment}
              disabled={!newEnvName.trim() || addEnvironment.isPending}
              data-testid="button-confirm-add-environment"
            >
              {addEnvironment.isPending ? "Adding..." : "Add Environment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
