import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Release {
  id: string;
  name: string;
  version?: string;
  team?: string;
  createdBy?: string;
  createdAt: string;
  status?: "not_started" | "in_progress" | "blocked" | "done";
  progress?: number;
  stages?: any[];
}

export interface CreateReleaseData {
  name: string;
  version?: string;
  team?: string;
  createdBy?: string;
}

export function useReleases(team?: string) {
  return useQuery<Release[]>({
    queryKey: ["/api/releases", team ? { team } : undefined],
  });
}

export function useRelease(id: string | null) {
  return useQuery<Release>({
    queryKey: id ? [`/api/releases/${id}`] : ["skip"],
    enabled: !!id,
  });
}

export function useCreateRelease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateReleaseData) => {
      const res = await apiRequest("POST", "/api/releases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
  });
}

export function useUpdateRelease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateReleaseData> }) => {
      const res = await apiRequest("PATCH", `/api/releases/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      queryClient.invalidateQueries({ queryKey: [`/api/releases/${variables.id}`] });
    },
  });
}

