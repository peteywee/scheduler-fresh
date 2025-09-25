"use client";

import { useState } from "react";
import Image from "next/image";
import { 
  Plus, 
  QrCode, 
  Copy, 
  ExternalLink, 
  Users, 
  MoreHorizontal
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Invite {
  code: string;
  shortCode: string;
  qrCodeUrl: string;
  role: string;
  expiresAt?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  notes?: string;
}

interface InviteManagerProps {
  orgId: string;
  orgName: string;
  isAdmin: boolean;
}

export default function InviteManager({ orgId, orgName, isAdmin }: InviteManagerProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);

  const [createForm, setCreateForm] = useState({
    role: "employee" as "admin" | "manager" | "employee",
    expiresIn: "",
    maxUses: "",
    notes: "",
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Admin access required to manage invites.</p>
        </CardContent>
      </Card>
    );
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Get CSRF token first
      const csrfResponse = await fetch("/api/auth/csrf");
      if (!csrfResponse.ok) {
        throw new Error("Failed to get CSRF token");
      }

      const csrfToken = document.cookie
        .split("; ")
        .find(row => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];

      if (!csrfToken) {
        throw new Error("CSRF token not found");
      }

      const payload = {
        orgId,
        role: createForm.role,
        ...(createForm.expiresIn && { expiresIn: parseInt(createForm.expiresIn) }),
        ...(createForm.maxUses && { maxUses: parseInt(createForm.maxUses) }),
        ...(createForm.notes && { notes: createForm.notes }),
      };

      const response = await fetch("/api/invites/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.invite) {
        const newInvite: Invite = {
          code: data.invite.code,
          shortCode: data.invite.shortCode,
          qrCodeUrl: data.invite.qrCodeUrl,
          role: createForm.role,
          expiresAt: data.invite.expiresAt,
          maxUses: data.invite.maxUses,
          currentUses: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          notes: createForm.notes,
        };

        setInvites([newInvite, ...invites]);
        setShowCreateDialog(false);
        setCreateForm({
          role: "employee",
          expiresIn: "",
          maxUses: "",
          notes: "",
        });
      } else {
        setError(data.error || "Failed to create invite");
      }
    } catch (err) {
      console.error("Create invite error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You might want to show a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getInviteUrl = (shortCode: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?code=${encodeURIComponent(shortCode)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  const isMaxedOut = (invite: Invite) => {
    return invite.maxUses !== undefined && invite.currentUses >= invite.maxUses;
  };

  const getInviteStatus = (invite: Invite) => {
    if (!invite.isActive) return { label: "Inactive", variant: "secondary" as const };
    if (isExpired(invite.expiresAt)) return { label: "Expired", variant: "destructive" as const };
    if (isMaxedOut(invite)) return { label: "Max Uses", variant: "outline" as const };
    return { label: "Active", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Invites
              </CardTitle>
              <CardDescription>
                Generate invite codes and QR codes for {orgName}
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Team Invite</DialogTitle>
                  <DialogDescription>
                    Generate a new invite code for team members to join {orgName}.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={createForm.role} onValueChange={(value: "admin" | "manager" | "employee") => setCreateForm({ ...createForm, role: value })}>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiresIn">Expires In (Days)</Label>
                      <Input
                        id="expiresIn"
                        type="number"
                        placeholder="e.g., 7"
                        value={createForm.expiresIn}
                        onChange={(e) => setCreateForm({ ...createForm, expiresIn: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Max Uses</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        placeholder="e.g., 10"
                        value={createForm.maxUses}
                        onChange={(e) => setCreateForm({ ...createForm, maxUses: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Internal notes about this invite..."
                      value={createForm.notes}
                      onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? "Creating..." : "Create Invite"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Invites Created</h3>
              <p className="text-muted-foreground mb-4">
                Create your first invite to start adding team members.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Invite
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => {
                    const status = getInviteStatus(invite);
                    return (
                      <TableRow key={invite.code}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {invite.shortCode}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(invite.shortCode)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{invite.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {invite.currentUses}
                          {invite.maxUses && ` / ${invite.maxUses}`}
                        </TableCell>
                        <TableCell>
                          {invite.expiresAt ? formatDate(invite.expiresAt) : "Never"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedInvite(invite);
                                setShowQRDialog(true);
                              }}>
                                <QrCode className="mr-2 h-4 w-4" />
                                Show QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                copyToClipboard(getInviteUrl(invite.shortCode));
                              }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                window.open(getInviteUrl(invite.shortCode), '_blank');
                              }}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Link
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code for Team Invite</DialogTitle>
            <DialogDescription>
              Team members can scan this QR code to join {orgName}.
            </DialogDescription>
          </DialogHeader>

          {selectedInvite && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <Image
                    src={selectedInvite.qrCodeUrl}
                    alt="QR Code"
                    width={300}
                    height={300}
                    className="mx-auto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Invite Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={selectedInvite.shortCode}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(selectedInvite.shortCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Join URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={getInviteUrl(selectedInvite.shortCode)}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(getInviteUrl(selectedInvite.shortCode))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Role:</strong> {selectedInvite.role}
                </div>
                <div>
                  <strong>Uses:</strong> {selectedInvite.currentUses}
                  {selectedInvite.maxUses && ` / ${selectedInvite.maxUses}`}
                </div>
                <div>
                  <strong>Created:</strong> {formatDate(selectedInvite.createdAt)}
                </div>
                <div>
                  <strong>Expires:</strong> {selectedInvite.expiresAt ? formatDate(selectedInvite.expiresAt) : "Never"}
                </div>
              </div>

              {selectedInvite.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedInvite.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}