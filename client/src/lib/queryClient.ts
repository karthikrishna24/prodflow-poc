import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get API base URL from environment or use default
const getApiBaseUrl = () => {
  // Allow override via environment variable (VITE_API_BASE_URL)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // In production, use api.dockvoyage.com
  // In development, use localhost (or current origin)
  if (import.meta.env.PROD) {
    return "https://api.dockvoyage.com";
  }
  
  // For local development, use the current origin (localhost)
  return window.location.origin;
};

export const API_BASE_URL = getApiBaseUrl();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    try {
      // Try to parse as JSON to extract user-friendly message
      const json = JSON.parse(text);
      throw new Error(json.message || text || res.statusText);
    } catch (parseError) {
      // If not JSON, use the text or status
      throw new Error(text || res.statusText);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Ensure URL starts with /, then prepend API base URL
  const fullUrl = url.startsWith("/") 
    ? `${API_BASE_URL}${url}`
    : `${API_BASE_URL}/${url}`;
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // queryKey can be:
    // ["/api/teams"] - simple path
    // ["/api/releases", id] - path with ID segment
    // ["/api/releases", { teamId: "..." }] - path with query params
    const path = Array.isArray(queryKey) 
      ? String(queryKey[0])
      : String(queryKey);
    
    let fullUrl = path.startsWith("/")
      ? `${API_BASE_URL}${path}`
      : `${API_BASE_URL}/${path}`;
    
    // Handle additional path segments or query parameters
    if (Array.isArray(queryKey) && queryKey.length > 1) {
      const secondElement = queryKey[1];
      
      // If it's a string, it's a path segment (like an ID)
      if (typeof secondElement === "string") {
        fullUrl = `${fullUrl}/${secondElement}`;
      }
      // If it's an object, it's query parameters
      else if (typeof secondElement === "object" && secondElement !== null) {
        const params = new URLSearchParams();
        Object.entries(secondElement as Record<string, string>).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        if (params.toString()) {
          fullUrl = `${fullUrl}?${params.toString()}`;
        }
      }
    }
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
