// src/components/schedule/shift-editor-dialog.tsx

"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
// ... other imports
import { OrgMember, Shift } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";


// Create a Zod schema for the form
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  start: z.string(), // Use string for input, convert to Date on submit
  end: z.string(),
  assignedTo: z.array(z.string()).optional(),
  venueId: z.string().optional(),
  standId: z.string().optional(),
});


interface ShiftEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: Shift;
  orgId: string;
}

export function ShiftEditorDialog({ isOpen, onOpenChange, shift, orgId }: ShiftEditorDialogProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  // resolver typing mismatch between @hookform/resolvers and this project's zod version;
  // it's safe to cast here.
  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      title: shift?.title || "",
      start: shift?.start?.toISOString().substring(0, 16) || "",
      end: shift?.end?.toISOString().substring(0, 16) || "",
      assignedTo: shift?.assignedTo || [],
      venueId: shift?.venueId || "",
      standId: shift?.standId || "",
    },
  });

  useEffect(() => {
    if (isOpen && orgId) {
      fetch(`/api/orgs/${orgId}/members`)
        .then((res) => res.json())
        .then((data) => setMembers(data))
        .catch(console.error);
    }
  }, [isOpen, orgId]);

  const onSubmit = async (_values: z.infer<typeof formSchema>) => {
    // ... (keep existing onSubmit logic)
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shift ? "Edit Shift" : "Add Shift"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...form.register("title")} />
            </div>

          <div>
            <Label>Assign To</Label>
            {/* This is a simplified single-select; for multi-select,
                you might need a more complex component or checkboxes. */}
            <Select
              onValueChange={(value) => form.setValue("assignedTo", [value])}
              defaultValue={shift?.assignedTo?.[0]}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.uid} value={member.uid}>
                    {member.displayName ?? member.email ?? member.uid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="venueId">Venue ID (Optional)</Label>
            <Input 
              id="venueId" 
              placeholder="e.g., venue-123" 
              {...form.register("venueId")} 
            />
          </div>

          <div>
            <Label htmlFor="standId">Stand/Booth/Zone ID (Optional)</Label>
            <Input 
              id="standId" 
              placeholder="e.g., booth-12, zone-a" 
              {...form.register("standId")} 
            />
          </div>

          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
