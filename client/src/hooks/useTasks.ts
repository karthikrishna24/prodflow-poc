import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Task {
  id: string;
  stageId: string;
  title: string;
  details?: string;
  owner?: string;
  required: boolean;
  status: "todo" | "doing" | "done" | "na";
  evidenceUrl?: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  details?: string;
  owner?: string;
  required?: boolean;
  status?: "todo" | "doing" | "done" | "na";
  evidenceUrl?: string;
}

export function useTasks(stageId: string | null) {
  return useQuery<Task[]>({
    queryKey: stageId ? [`/api/stages/${stageId}`] : ["skip"],
    enabled: !!stageId,
    select: (data: any) => data?.tasks || [],
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ stageId, data }: { stageId: string; data: CreateTaskData }) => {
      const res = await apiRequest("POST", `/api/stages/${stageId}/tasks`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stages/${variables.stageId}`] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTaskData> }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
    },
  });
}

