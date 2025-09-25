"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QrCode, Plus, Copy, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Invite {
  code: string;
  shortCode: string;
  role: "admin" | "manager" | "employee";
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  createdAt: string;
  isActive: boolean;
  qrCodeUrl?: string;
}

async function getCsrfToken(): Promise<string> {
  await fetch("/api/auth/csrf", { method: "GET", credentials: "include" });
  const token = document.cookie
    .split("; ")
    .find(row => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return token || "";
}

export default function InvitesPage() {
  const _router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Form state
  const [role, setRole] = useState<"admin" | "manager" | "employee">("employee");
  const [expiresIn, setExpiresIn] = useState("30"); // days
  const [maxUses, setMaxUses] = useState("10");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/invites/list", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Failed to load invites:', error);
      toast({
        title: "Error",
        description: "Failed to load invites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    try {
      setCreating(true);
      const csrf = await getCsrfToken();
      
      const response = await fetch("/api/invites/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        credentials: "include",
        body: JSON.stringify({
          role,
          expiresIn: parseInt(expiresIn),
          maxUses: parseInt(maxUses),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Invite created successfully",
        });
        setShowCreateDialog(false);
        loadInvites();
        // Reset form
        setRole("employee");
        setExpiresIn("30");
        setMaxUses("10");
        setNotes("");
      } else {
        throw new Error(data.error || "Failed to create invite");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invite",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = (shortCode: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const inviteUrl = `${baseUrl}/join?code=${shortCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Copied",
      description: "Invite link copied to clipboard",
    });
  };

  const revokeInvite = async (code: string) => {
    try {
      const csrf = await getCsrfToken();
      const response = await fetch(`/api/invites/${code}/revoke`, {
        method: "POST",
        headers: {
          "x-csrf-token": csrf,
        },
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invite revoked successfully",
        });
        loadInvites();
      } else {
        throw new Error("Failed to revoke invite");
      }
    } catch (error) {
      console.error('Failed to revoke invite:', error);
      toast({
        title: "Error",
        description: "Failed to revoke invite",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (invite: Invite) => {
    if (!invite.isActive) return <Badge variant="destructive">Revoked</Badge>;
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (invite.maxUses && invite.currentUses >= invite.maxUses) {
      return <Badge variant="destructive">Exhausted</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invite Management</h1>
          <p className="text-muted-foreground">Create and manage organization invites</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Invite</DialogTitle>
              <DialogDescription>
                Generate an invite code to add new members to your organization.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(value: any) => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expiresIn">Expires in (days)</Label>
                <Input
                  id="expiresIn"
                  type="number"
                  value={expiresIn}
                  onChange={(event) => setExpiresIn(event.target.value)}
                  min="1"
                  max="365"
                />
              </div>

              <div>
                <Label htmlFor="maxUses">Maximum uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this invite..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createInvite} disabled={creating}>
                  {creating ? "Creating..." : "Create Invite"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Invites</CardTitle>
          <CardDescription>
            Manage your organization's invite codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading invites...</div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No invites created yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invite
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.code}>
                    <TableCell className="font-mono">{invite.shortCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {invite.currentUses}/{invite.maxUses || "∞"}
                    </TableCell>
                    <TableCell>
                      {invite.expiresAt ? formatDate(invite.expiresAt) : "Never"}
                    </TableCell>
                    <TableCell>{getStatusBadge(invite)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.shortCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {invite.qrCodeUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invite.qrCodeUrl, "_blank")}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        {invite.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeInvite(invite.code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}