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
      environmentId={data.environmentId}
      name={data.name}
      env={data.env}
      color={data.color}
      status={data.status}
      tasksCompleted={data.tasksCompleted}
      tasksTotal={data.tasksTotal}
      lastUpdate={data.lastUpdate}
      onClick={data.onClick}
      onEdit={data.onEdit}
      onDelete={data.onDelete}
    />
  ),
};

interface EnvironmentFlowCanvasProps {
  releaseId: string | null;
  onEnvironmentClick?: (stageId: string) => void;
}

const mergeSavedFreeNodes = (savedNodes: any[], stageNodeIds: Set<string>) => {
  // Keep any saved node whose id isn't a stage id (i.e., free boxes)
  return (savedNodes || []).filter(n => !stageNodeIds.has(n.id));
};


export default function EnvironmentFlowCanvas({ releaseId, onEnvironmentClick }: EnvironmentFlowCanvasProps) {
  const { data: release, isLoading } = useRelease(releaseId);
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvDescription, setNewEnvDescription] = useState("");
  const [newEnvColor, setNewEnvColor] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editEnvId, setEditEnvId] = useState<string | null>(null);
  const [editEnvName, setEditEnvName] = useState("");
  const [editEnvColor, setEditEnvColor] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Predefined color options for environments
  const colorOptions = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Green", value: "#10B981" },
    { name: "Yellow", value: "#F59E0B" },
    { name: "Red", value: "#EF4444" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Pink", value: "#EC4899" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Teal", value: "#14B8A6" },
  ];

  // Fetch saved diagram layout
  const { data: diagram } = useQuery<{ layout?: { nodes?: any[]; edges?: any[] } }>({
    queryKey: ['/api/releases', releaseId, 'diagram'],
    enabled: !!releaseId,
  });

  const environments = useMemo(() => {
    if (!release?.stages) return [];
    
    return release.stages.map((stage: any) => {
      const environment = stage.environment || { id: stage.environmentId, name: "Unknown", color: undefined };
      const tasks = stage.tasks || [];
      const tasksCompleted = tasks.filter((t: any) => t.status === "done").length;
      const tasksTotal = tasks.length;
      
      return {
        id: stage.id,
        environmentId: stage.environmentId,
        name: environment.name,
        color: environment.color,
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

  const handleEditEnvironment = (environmentId: string, name: string, color?: string) => {
    setEditEnvId(environmentId);
    setEditEnvName(name);
    setEditEnvColor(color || "");
    setIsEditDialogOpen(true);
  };

  // const initialNodes: Node[] = useMemo(() => {
  //   if (environments.length === 0) return [];
    
  //   // Strictly use saved layout with aggressive preservation
  //   const savedLayout = diagram?.layout;
  //   const savedNodes = savedLayout?.nodes || [];

  //   return environments.map((env, index) => {
  //     // Use exact saved position, with minimal predictable fallback
  //     const savedNode = savedNodes.find((n: any) => n.id === env.id);
  //     const position = savedNode?.position || { 
  //       x: index * 300,  // Spread out initial nodes if no saved position
  //       y: 0 
  //     };

  //     return {
  //       id: env.id,
  //       type: "environment",
  //       position: { 
  //         x: position.x, 
  //         y: position.y 
  //       },
  //       draggable: true,
  //       selectable: true,
  //       connectable: true,
  //       data: {
  //         id: env.id,
  //         environmentId: env.environmentId,
  //         name: env.name,
  //         env: env.name.toLowerCase(), // Use environment name as env type
  //         color: env.color,
  //         status: env.status,
  //         tasksCompleted: env.tasksCompleted,
  //         tasksTotal: env.tasksTotal,
  //         lastUpdate: env.lastUpdate,
  //         blockers: env.blockers,
  //         onClick: () => onEnvironmentClick?.(env.id),
  //         onEdit: () => handleEditEnvironment(env.environmentId, env.name, env.color),
  //         onDelete: () => handleDeleteEnvironment(env.id),
  //       },
  //     };
  //   });
  // }, [environments, diagram, onEnvironmentClick]);
  
  const initialNodes: Node[] = useMemo(() => {
  if (environments.length === 0) return [];

  const savedLayout = diagram?.layout;
  const savedNodes = savedLayout?.nodes || [];

  // Stage-backed nodes
  const stageNodeIds = new Set(environments.map(e => e.id));

  const stageNodes = environments.map((env, index) => {
    const savedNode = savedNodes.find((n: any) => n.id === env.id);
    // Calculate position with better spacing and randomization
    const position = savedNode?.position || {
      x: Math.random() * 1200 + 100,  // Wider area (1200px) with 100px margin
      y: Math.random() * 800 + 100    // Taller area (800px) with 100px margin
    };
    
    // Ensure numbers are exact
    position.x = Number(position.x.toFixed(2));
    position.y = Number(position.y.toFixed(2));

    return {
      id: env.id,
      type: "environment",
      position,
      draggable: true,
      selectable: true,
      connectable: true,
      data: {
        id: env.id,
        environmentId: env.environmentId,
        name: env.name,
        env: env.name.toLowerCase(),
        color: env.color,
        status: env.status,
        tasksCompleted: env.tasksCompleted,
        tasksTotal: env.tasksTotal,
        lastUpdate: env.lastUpdate,
        blockers: env.blockers,
        onClick: () => onEnvironmentClick?.(env.id),
        onEdit: () => handleEditEnvironment(env.environmentId, env.name, env.color),
        onDelete: () => handleDeleteEnvironment(env.id),
      },
    } as Node;
  });

  // Bring back any saved "free" nodes not tied to stages
  const freeNodes = mergeSavedFreeNodes(savedNodes, stageNodeIds).map((n: any) => ({
    id: n.id,
    type: n.type ?? "environment",
    position: n.position ?? { x: 0, y: 0 },
    draggable: true,
    selectable: true,
    connectable: true,
    data: {
      // Allow simple label-only free boxes
      id: n.data?.id ?? n.id,
      name: n.data?.name ?? "Free Box",
      env: n.data?.env ?? "custom",
      color: n.data?.color,
      status: n.data?.status ?? "not_started",
      tasksCompleted: n.data?.tasksCompleted ?? 0,
      tasksTotal: n.data?.tasksTotal ?? 0,
      lastUpdate: n.data?.lastUpdate ?? "—",
      blockers: n.data?.blockers ?? [],
      // no edit/delete handlers for free unless you want them
    },
  }));

  return [...stageNodes, ...freeNodes];
}, [environments, diagram, onEnvironmentClick]);


  const initialEdges: Edge[] = useMemo(() => {
    // Only load saved edges - no automatic connections
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

    // Return empty array - user creates connections manually
    return [];
  }, [diagram]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initial nodes change
  useEffect(() => {
    // Only update nodes if there are no existing nodes or no unsaved changes
    if (nodes.length === 0 || !hasUnsavedChanges) {
      const preservedNodes = nodes.reduce((acc, node) => {
        acc[node.id] = {
          position: { ...node.position },
          data: { ...node.data }
        };
        return acc;
      }, {} as Record<string, any>);

      const updatedNodes = initialNodes.map(node => ({
        ...node,
        // Preserve existing node positions if they exist
        position: preservedNodes[node.id]?.position || node.position,
        data: {
          ...node.data,
          ...preservedNodes[node.id]?.data
        }
      }));

      setNodes(updatedNodes);
    }
  }, [initialNodes, setNodes, nodes, hasUnsavedChanges]);

  // Update edges when initial edges change
  useEffect(() => {
    // Only apply server-side edge updates when there are no local unsaved changes.
    // This prevents a race where a newly-created connection is lost when the server-side
    // diagram state is refetched before the local save completes.
    if (!hasUnsavedChanges) {
      setEdges(initialEdges);
    }
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
    // Process each change individually
    changes.forEach(change => {
      if (change.type === 'position' && 'position' in change && change.position) {
        // Ensure position values are exact numbers
        change.position.x = Number(change.position.x);
        change.position.y = Number(change.position.y);
      }
    });

    onNodesChange(changes);

    // Mark as unsaved for any position change that's finished (not during drag)
    const hasPositionChange = changes.some(
      (change) => change.type === 'position' && 'dragging' in change && !change.dragging
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
          position: {
            x: Number(node.position.x),  // Convert to number and preserve exact position
            y: Number(node.position.y),  // Convert to number and preserve exact position
          },
          type: node.type,
          data: {
            ...node.data,  // Preserve all data
            id: node.data.id,
            name: node.data.name,
            // Keep all other properties
            environmentId: node.data.environmentId,
            status: node.data.status,
            color: node.data.color,
            env: node.data.env,
          },
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

      const response = await apiRequest('PUT', `/api/releases/${releaseId}/diagram`, { 
        layout,
        preserveLayout: true  // New flag to indicate strict layout preservation
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId, 'diagram'] });
      setHasUnsavedChanges(false);
      toast({
        title: "Layout saved",
        description: "Your canvas layout has been saved exactly as positioned.",
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
    mutationFn: async ({ name, description, color }: { name: string; description?: string; color?: string }) => {
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
        color,
        sortOrder: String(environments.length),
      });
      const env = await envResponse.json();

      // Then create a stage for this environment in the current release
      const stageResponse = await apiRequest('POST', `/api/releases/${releaseId}/stages`, {
        environmentId: env.id,
        status: 'not_started',
      });
      const stage = await stageResponse.json();

      // Return both env and stage so caller can update local UI immediately
      return { env, stage };
    },
    onSuccess: (result: any) => {
      // result contains { env, stage }
      const { env, stage } = result || {};

      // Add a node locally so it won't be lost by auto-save races
      try {
        const existing = nodes.find((n: any) => n.id === stage.id);
        if (!existing) {
          const newNode: Node = {
            id: stage.id,
            type: 'environment',
            position: diagram?.layout?.nodes?.find((n: any) => n.id === stage.id)?.position || { x: 200, y: 200 },
            draggable: true,
            selectable: true,
            connectable: true,
            data: {
              id: stage.id,
              environmentId: stage.environmentId || env?.id,
              name: env?.name || stage.name || 'Environment',
              env: (env?.name || stage.name || 'Environment').toLowerCase(),
              color: env?.color,
              status: stage.status || 'not_started',
              tasksCompleted: 0,
              tasksTotal: 0,
              lastUpdate: '—',
              blockers: [],
              onClick: () => onEnvironmentClick?.(stage.id),
              onEdit: () => handleEditEnvironment(stage.environmentId || env?.id, env?.name || '' , env?.color),
              onDelete: () => handleDeleteEnvironment(stage.id),
            },
          } as Node;

          setNodes((prev) => {
            return [...prev, newNode];
          });
        setHasUnsavedChanges(true);
        }
      } catch (err) {
        console.error('Could not add node locally', err);
      }

      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
      setIsAddDialogOpen(false);
      setNewEnvName("");
      setNewEnvDescription("");
      setNewEnvColor("");
      toast({
        title: "Environment added",
        description: "New environment has been added to the canvas.",
      });
    },
    onError: async (error: any, variables: any) => {
      // If it's a duplicate-name error, try to reuse the existing team environment
      const isDuplicate = typeof error?.message === 'string' && error.message.includes('already exists in this team');
      if (isDuplicate) {
        try {
          const teamId = release?.teamId || release?.team;
          // If we can list team environments, try to find a match by name and create a stage for it
          if (teamId && variables?.name) {
            const envRes = await apiRequest('GET', `/api/teams/${teamId}/environments`);
            const envs = await envRes.json();
            const found = (envs || []).find((e: any) => String(e.name).toLowerCase() === String(variables.name).toLowerCase());
            if (found) {
              // Create a stage for this release using the existing environment
              const stageRes = await apiRequest('POST', `/api/releases/${releaseId}/stages`, {
                environmentId: found.id,
                status: 'not_started',
              });
              const createdStage = await stageRes.json();

              // Insert node locally so it isn't lost by auto-save
              try {
                const existing = nodes.find((n: any) => n.id === createdStage.id);
                if (!existing) {
                  const newNode: Node = {
                    id: createdStage.id,
                    type: 'environment',
                    position: diagram?.layout?.nodes?.find((n: any) => n.id === createdStage.id)?.position || { x: 200, y: 200 },
                    draggable: true,
                    selectable: true,
                    connectable: true,
                    data: {
                      id: createdStage.id,
                      environmentId: found.id,
                      name: found.name,
                      env: (found.name || 'environment').toLowerCase(),
                      color: found.color,
                      status: createdStage.status || 'not_started',
                      tasksCompleted: 0,
                      tasksTotal: 0,
                      lastUpdate: '—',
                      blockers: [],
                      onClick: () => onEnvironmentClick?.(createdStage.id),
                      onEdit: () => handleEditEnvironment(found.id, found.name, found.color),
                      onDelete: () => handleDeleteEnvironment(createdStage.id),
                    },
                  } as Node;

                  setNodes((prev) => [...prev, newNode]);
                  setHasUnsavedChanges(true);
                }
              } catch (err) {
                console.error('Could not add reused env node locally', err);
              }

              queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
              setIsAddDialogOpen(false);
              setNewEnvName("");
              setNewEnvDescription("");
              setNewEnvColor("");
              toast({
                title: "Environment reused",
                description: `An existing environment named "${variables.name}" was found and added to this release.`,
              });
              return;
            }
          }
        } catch (err) {
          // If any of the fallback steps fail, we'll fall through to showing the original error
          console.error('Fallback reuse failed', err);
        }
      }

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
        description: newEnvDescription.trim() || undefined,
        color: newEnvColor || undefined
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

  // Edit environment mutation
  const editEnvironment = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color?: string }) => {
      const response = await apiRequest('PATCH', `/api/environments/${id}`, { name, color });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/releases', releaseId] });
      setIsEditDialogOpen(false);
      setEditEnvId(null);
      setEditEnvName("");
      setEditEnvColor("");
      toast({
        title: "Environment updated",
        description: "Environment has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update environment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateEnvironment = () => {
    if (editEnvId && editEnvName.trim()) {
      editEnvironment.mutate({ 
        id: editEnvId,
        name: editEnvName.trim(),
        color: editEnvColor || undefined
      });
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
            <div className="space-y-2">
              <Label>Color (Optional)</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setNewEnvColor(colorOption.value)}
                    className={`w-10 h-10 rounded-md border-2 transition-all ${
                      newEnvColor === colorOption.value 
                        ? 'border-primary scale-110' 
                        : 'border-border hover-elevate'
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                    data-testid={`color-option-${colorOption.name.toLowerCase()}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewEnvName("");
                setNewEnvDescription("");
                setNewEnvColor("");
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment</DialogTitle>
            <DialogDescription>
              Update the name and color for this environment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-env-name">Environment Name</Label>
              <Input
                id="edit-env-name"
                placeholder="e.g., Staging, UAT, Production"
                value={editEnvName}
                onChange={(e) => setEditEnvName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editEnvName.trim() && !e.shiftKey) {
                    handleUpdateEnvironment();
                  }
                }}
                data-testid="input-edit-environment-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color (Optional)</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setEditEnvColor(colorOption.value)}
                    className={`w-10 h-10 rounded-md border-2 transition-all ${
                      editEnvColor === colorOption.value 
                        ? 'border-primary scale-110' 
                        : 'border-border hover-elevate'
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                    data-testid={`edit-color-option-${colorOption.name.toLowerCase()}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditEnvId(null);
                setEditEnvName("");
                setEditEnvColor("");
              }}
              data-testid="button-cancel-edit-environment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEnvironment}
              disabled={!editEnvName.trim() || editEnvironment.isPending}
              data-testid="button-confirm-edit-environment"
            >
              {editEnvironment.isPending ? "Updating..." : "Update Environment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
