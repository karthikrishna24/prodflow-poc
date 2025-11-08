import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Release {
  id: string;
  name: string;
  version?: string;
  team?: string;
  teamId?: string; // API returns teamId
  createdBy?: string;
  createdAt: string;
  status?: "not_started" | "in_progress" | "blocked" | "done";
  progress?: number;
  stages?: any[];
}

export interface CreateReleaseData {
  name: string;
  version?: string;
  teamId?: string; // Changed from 'team' to 'teamId' to match API
  createdBy?: string;
}

export function useReleases(teamId?: string) {
  return useQuery<Release[]>({
    queryKey: ["/api/releases", teamId ? { teamId } : undefined],
    // The default queryFn from queryClient will handle the API_BASE_URL and query params
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      // Also invalidate with teamId if provided
      if (variables.teamId) {
        queryClient.invalidateQueries({ queryKey: ["/api/releases", { teamId: variables.teamId }] });
      }
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

export function useDeleteRelease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (releaseId: string) => {
      const res = await apiRequest("DELETE", `/api/releases/${releaseId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
  });
}

