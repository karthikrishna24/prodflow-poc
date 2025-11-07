import { useCallback, useMemo } from "react";
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
import EnvironmentNode from "./EnvironmentNode";
import { useRelease } from "@/hooks/useReleases";
import { formatDistanceToNow } from "date-fns";

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
    />
  ),
};

interface EnvironmentFlowCanvasProps {
  releaseId: string | null;
  onEnvironmentClick?: (envId: string) => void;
}

export default function EnvironmentFlowCanvas({ releaseId, onEnvironmentClick }: EnvironmentFlowCanvasProps) {
  const { data: release, isLoading } = useRelease(releaseId);
  
  const environments = useMemo(() => {
    if (!release?.stages) return [];
    
    const envOrder = ["staging", "uat", "prod"] as const;
    return envOrder.map((env) => {
      const stage = release.stages?.find((s: any) => s.env === env);
      if (!stage) {
        return {
          id: env,
          name: `${env.charAt(0).toUpperCase() + env.slice(1)} Environment`,
          env,
          tasksCompleted: 0,
          tasksTotal: 0,
          lastUpdate: "Never",
          status: "not_started" as const,
        };
      }
      
      const tasks = stage.tasks || [];
      const tasksCompleted = tasks.filter((t: any) => t.status === "done").length;
      const tasksTotal = tasks.length;
      
      return {
        id: stage.id,
        name: `${env.charAt(0).toUpperCase() + env.slice(1)} Environment`,
        env,
        tasksCompleted,
        tasksTotal,
        lastUpdate: stage.lastUpdate 
          ? formatDistanceToNow(new Date(stage.lastUpdate), { addSuffix: true })
          : "Never",
        status: stage.status,
      };
    });
  }, [release]);

  const initialNodes: Node[] = useMemo(() => {
    if (environments.length === 0) return [];
    
    const nodeSpacing = 320;
    const startX = 150;
    const centerY = 250;

    return environments.map((env, index) => {
      return {
        id: env.id,
        type: "environment",
        position: { x: startX + (index * nodeSpacing), y: centerY },
        data: {
          id: env.id,
          name: env.name,
          env: env.env,
          status: env.status,
          tasksCompleted: env.tasksCompleted,
          tasksTotal: env.tasksTotal,
          lastUpdate: env.lastUpdate,
          onClick: () => onEnvironmentClick?.(env.env),
        },
      };
    });
  }, [environments, onEnvironmentClick]);

  const initialEdges: Edge[] = useMemo(() => {
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
  }, [environments]);

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
      <div className="w-full h-full bg-background flex items-center justify-center" data-testid="environment-flow-canvas">
        <div className="text-muted-foreground">Loading environments...</div>
      </div>
    );
  }

  if (!releaseId || environments.length === 0) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center" data-testid="environment-flow-canvas">
        <div className="text-muted-foreground">No environments found</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background" data-testid="environment-flow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
