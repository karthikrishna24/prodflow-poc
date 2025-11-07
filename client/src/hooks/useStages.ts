import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Stage {
  id: string;
  releaseId: string;
  env: "staging" | "uat" | "prod";
  status: "not_started" | "in_progress" | "blocked" | "done";
  approver?: string;
  startedAt?: string;
  endedAt?: string;
  lastUpdate: string;
  tasks?: any[];
  blockers?: any[];
}

export function useStage(id: string | null) {
  return useQuery<Stage>({
    queryKey: id ? [`/api/stages/${id}`] : ["skip"],
    enabled: !!id,
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Stage> }) => {
      const res = await apiRequest("PATCH", `/api/stages/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stages/${variables.id}`] });
    },
  });
}

export function useApproveStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, approver, note }: { id: string; approver: string; note?: string }) => {
      const res = await apiRequest("POST", `/api/stages/${id}/approve`, { approver, note });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stages/${variables.id}`] });
    },
  });
}

