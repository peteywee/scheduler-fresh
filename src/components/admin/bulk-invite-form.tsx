"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload } from "lucide-react";

interface BulkInviteFormProps {
  orgId: string;
  onInvitesCreated: (count: number) => void;
}

export default function BulkInviteForm({
  orgId,
  onInvitesCreated,
}: BulkInviteFormProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [csvData, setCsvData] = useState("");

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Normalize and parse CSV safely
      const raw = csvData.replace(/^\uFEFF/, "").trim(); // strip BOM
      const lines = raw.split(/\r?\n/);
      // Optional header detection: if first line contains 'email' and 'role', skip it
      const startIdx =
        lines[0]?.toLowerCase().includes("email") &&
        lines[0]?.toLowerCase().includes("role")
          ? 1
          : 0;

      const allowedRoles = new Set(["employee", "manager", "admin"]);
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const users: { email: string; role: string }[] = [];
      const errors: string[] = [];

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue; // skip empty/comments
        const parts = line.split(",").map((s) => s.trim());
        if (parts.length < 2) {
          errors.push(`Line ${i + 1}: expected "email,role"`);
          continue;
        }
        const [email, role] = parts;
        if (!emailRe.test(email)) {
          errors.push(`Line ${i + 1}: invalid email "${email}"`);
          continue;
        }
        if (!allowedRoles.has(role)) {
          errors.push(
            `Line ${i + 1}: invalid role "${role}" (allowed: employee, manager, admin)`,
          );
          continue;
        }
        users.push({ email, role });
      }

      if (errors.length) {
        setError(`Invalid CSV:\n${errors.join("\n")}`);
        setIsLoading(false);
        return;
      }
      if (users.length === 0) {
        setError("No valid user rows found.");
        setIsLoading(false);
        return;
      }

      const payload = {
        orgId,
        users,
      };

      const response = await fetch("/api/invites/bulk-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        onInvitesCreated(data.createdCount);
        setShowDialog(false);
        setCsvData("");
      } else {
        setError(data.error || "Failed to create invites");
      }
    } catch (err) {
      console.error("Bulk invite error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvData(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>
            Paste a CSV content or upload a CSV file with user emails and roles.
            The format should be: email,role
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleBulkInvite} className="space-y-4">
          <Textarea
            placeholder="email,role\nuser1@example.com,employee\nuser2@example.com,manager"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={10}
          />

          <div className="flex items-center justify-between">
            <input type="file" accept=".csv" onChange={handleFileChange} />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Importing..." : "Import Users"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
