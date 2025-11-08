import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Anchor, Users, Mail, UserPlus, Clock, Check, X } from "lucide-react";
import { Link } from "wouter";

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "developer">("developer");

  const { data: workspaces } = useQuery<any[]>({
    queryKey: ["/api/workspaces"],
    enabled: !!user,
  });

  const { data: invitations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/invitations"],
    enabled: !!user,
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string; workspaceId: string }) => {
      const response = await fetch("/api/invitations", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to send invitation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      setEmail("");
      setRole("developer");
      toast({
        title: "Invitation sent!",
        description: "The team member will receive an email to join your workspace.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaces || workspaces.length === 0) {
      toast({
        title: "No workspace found",
        description: "Please contact support",
        variant: "destructive",
      });
      return;
    }

    sendInviteMutation.mutate({
      email,
      role,
      workspaceId: workspaces[0].id,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "accepted":
        return <Check className="h-4 w-4 text-green-500" />;
      case "declined":
      case "expired":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-card flex items-center justify-between px-6">
        <Link href="/">
          <a className="flex items-center gap-3 cursor-pointer" data-testid="link-home">
            <Anchor className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">DockVoyage</h1>
          </a>
        </Link>
      </header>

      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Team Management</h2>
          <p className="text-muted-foreground">
            Invite crew members to join your workspace
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              <CardTitle>Invite New Member</CardTitle>
            </div>
            <CardDescription>
              Send an invitation via email. They'll receive a nautical-themed welcome aboard message!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="crew@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-invite-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value: "admin" | "developer") => setRole(value)}>
                  <SelectTrigger id="role" data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {role === "admin" 
                    ? "Admins can manage the workspace and invite other members"
                    : "Developers can manage releases and view team data"}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={sendInviteMutation.isPending}
                data-testid="button-send-invite"
              >
                {sendInviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Pending & Recent Invitations</CardTitle>
            </div>
            <CardDescription>
              Track all invitations you've sent to your crew
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading invitations...
              </div>
            ) : !invitations || invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invitations yet. Start by inviting your first crew member!
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    data-testid={`invitation-${invitation.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {invitation.role === "admin" ? "Admin" : "Developer"} • Sent{" "}
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invitation.status)}
                      <span className="text-sm font-medium">
                        {getStatusText(invitation.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
