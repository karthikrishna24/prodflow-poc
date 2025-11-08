import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Anchor, Ship, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function InviteAccept() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const token = params?.token;

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: token ? [`/api/invitations/${token}`] : ["skip"],
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No invitation token");
      const response = await apiRequest("POST", `/api/invitations/${token}/accept`);
      return response.json();
    },
    onSuccess: () => {
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation may have expired or been revoked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle>Welcome Aboard!</CardTitle>
            <CardDescription>
              You've successfully joined {invitation.workspaceName}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (acceptMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle>Error Accepting Invitation</CardTitle>
            <CardDescription>
              {(acceptMutation.error as any)?.message || "Something went wrong. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
              data-testid="button-go-home"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Anchor className="h-16 w-16 text-primary" />
            </div>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in or create an account to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm font-medium mb-2">You've been invited to:</p>
              <p className="text-lg font-bold">{invitation.workspaceName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                by {invitation.inviterName}
              </p>
            </div>
            <Button
              onClick={() => setLocation("/auth")}
              className="w-full"
              data-testid="button-sign-in"
            >
              Sign In to Accept
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-4 mb-4">
            <Ship className="h-16 w-16 text-primary/70" />
            <Anchor className="h-16 w-16 text-primary" />
          </div>
          <CardTitle>You've Been Invited!</CardTitle>
          <CardDescription>
            Join {invitation.workspaceName} on DockVoyage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-accent rounded-lg space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Invited by</p>
              <p className="font-medium">{invitation.inviterName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your role</p>
              <p className="font-medium">
                {invitation.role === "admin" ? "Admin" : "Developer"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Workspace</p>
              <p className="font-medium">{invitation.workspaceName}</p>
            </div>
          </div>

          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            className="w-full"
            data-testid="button-accept-invite"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept Invitation"
            )}
          </Button>

          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="w-full"
            data-testid="button-decline"
          >
            Maybe Later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
