import { useCallback, useState, useMemo } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import TaskCard from "./TaskCard";
import TaskDetailsDialog from "./TaskDetailsDialog";
import { useRelease } from "@/hooks/useReleases";

const nodeTypes = {
  task: ({ data }: any) => (
    <TaskCard
      id={data.id}
      title={data.title}
      status={data.status}
      owner={data.owner}
      required={data.required}
      priority={data.priority}
      evidenceCount={data.evidenceCount}
      onClick={data.onClick}
    />
  ),
};

interface TaskFlowCanvasProps {
  releaseId: string;
  envId: "staging" | "uat" | "prod";
  environmentName: string;
}

export default function TaskFlowCanvas({ releaseId, envId, environmentName }: TaskFlowCanvasProps) {
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const { data: release, isLoading } = useRelease(releaseId);
  
  const tasks = useMemo(() => {
    if (!release?.stages) return [];
    
    const stage = release.stages.find((s: any) => s.env === envId);
    if (!stage?.tasks) return [];
    
    return stage.tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status as "todo" | "doing" | "done" | "na",
      owner: task.owner,
      required: task.required,
      priority: undefined as "P1" | "P2" | "P3" | undefined, // Priority not in schema yet
      evidenceCount: task.evidenceUrl ? 1 : 0,
    }));
  }, [release, envId]);

  const initialNodes: Node[] = useMemo(() => {
    if (tasks.length === 0) return [];
    
    const nodeSpacing = 360;
    const startX = 150;
    const centerY = 250;

    return tasks.map((task, index) => ({
      id: task.id,
      type: "task",
      position: { x: startX + (index * nodeSpacing), y: centerY },
      data: {
        ...task,
        onClick: () => setSelectedTask({ id: task.id, title: task.title }),
      },
    }));
  }, [tasks]);

  const initialEdges: Edge[] = useMemo(() => {
    return tasks.slice(0, -1).map((task, index) => {
      const nextTask = tasks[index + 1];
      const isCompleted = task.status === "done";
      
      return {
        id: `${task.id}-${nextTask.id}`,
        source: task.id,
        target: nextTask.id,
        type: "straight",
        animated: isCompleted,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCompleted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        },
        style: { 
          stroke: isCompleted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", 
          strokeWidth: 3,
        },
      };
    });
  }, [tasks]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
    },
    [setEdges]
  );

  if (isLoading) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center" data-testid="task-flow-canvas">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center" data-testid="task-flow-canvas">
        <div className="text-muted-foreground">No tasks found for this environment</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full bg-background" data-testid="task-flow-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          minZoom={0.3}
          maxZoom={1.2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {selectedTask && (
        <TaskDetailsDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          taskTitle={selectedTask.title}
          taskId={selectedTask.id}
        />
      )}
    </>
  );
}
