// src/components/schedule/schedule-calendar.tsx

"use client";

import { useState, useEffect } from "react";
// Using a lightweight UI shift type (decoupled from canonical branded types)
// TODO: Refactor to use domain Shift with proper eventId/positions/status when backend wiring is ready.
type UIShift = {
  id: string;
  orgId: string;
  title?: string;
  start: Date;
  end: Date;
  assignedTo?: string[];
  createdAt: Date;
  updatedAt: Date;
};
import { ShiftEditorDialog, type ShiftLike } from "./shift-editor-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ScheduleCalendar({
  orgId = "demo",
}: {
  orgId?: string;
}) {
  const [shifts, setShifts] = useState<UIShift[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<UIShift | undefined>(
    undefined,
  );

  // TODO: Fetch shifts from the API in a useEffect hook
  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/shifts?orgId=${encodeURIComponent(orgId)}`)
      .then((res) => res.json())
      .then((data) => {
        // parse ISO strings to Date objects for UI usage
        type RawShift = {
          start?: string | null;
          end?: string | null;
          createdAt?: string | null;
          updatedAt?: string | null;
          [k: string]: unknown;
        };
        const parsed = (data as RawShift[])
          .map((s) => {
            const rec = s as RawShift & Record<string, unknown>;
            return {
              id:
                typeof rec.id === "string"
                  ? rec.id
                  : String(Math.random()).slice(2, 8),
              orgId: typeof rec.orgId === "string" ? rec.orgId : orgId,
              venueId:
                typeof rec.venueId === "string" ? rec.venueId : undefined,
              standId:
                typeof rec.standId === "string" ? rec.standId : undefined,
              title: typeof rec.title === "string" ? rec.title : undefined,
              assignedTo: Array.isArray(rec.assignedTo)
                ? (rec.assignedTo as string[])
                : undefined,
              notes: typeof rec.notes === "string" ? rec.notes : undefined,
              start: s.start ? new Date(s.start) : new Date(),
              end: s.end ? new Date(s.end) : new Date(),
              createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
              updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
            };
          })
          .filter((s) => Boolean(s.id && s.orgId && s.start && s.end));

        setShifts(parsed as UIShift[]);
      })
      .catch((e) => console.error("Failed to fetch shifts", e));
  }, [orgId]);

  // Demo/helper: populate a few sample shifts to speed up initial setup
  const populateSample = () => {
    const now = Date.now();
    const sample: UIShift[] = [
      {
        id: "s1",
        orgId: "demo",
        title: "Morning Shift - Alice",
        start: new Date(now + 1000 * 60 * 60 * 9),
        end: new Date(now + 1000 * 60 * 60 * 13),
        assignedTo: ["alice"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "s2",
        orgId: "demo",
        title: "Lunch Shift - Bob",
        start: new Date(now + 1000 * 60 * 60 * 12),
        end: new Date(now + 1000 * 60 * 60 * 16),
        assignedTo: ["bob"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    setShifts(sample);
  };

  const handleAddShift = () => {
    setSelectedShift(undefined);
    setIsDialogOpen(true);
  };

  const handleEditShift = (shift: UIShift) => {
    setSelectedShift(shift);
    setIsDialogOpen(true);
  };

  // Temporary adapter to satisfy ShiftEditorDialog until full canonical Shift integration
  function adaptToShiftLike(s: UIShift): ShiftLike {
    return {
      ...s,
      eventId: "temp-event",
      positions: [] as unknown[],
      status: "open",
    };
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div className="flex gap-2">
          <Button onClick={handleAddShift}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Shift
          </Button>
          <Button variant="ghost" onClick={populateSample}>
            Populate sample week
          </Button>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={() => console.log("Export schedule (TODO)")}
          >
            Export
          </Button>
        </div>
      </div>

      {/* This is where you will build your calendar grid.
        Map over the `shifts` state to display them.
        Each shift should have an `onClick` that calls `handleEditShift(shift)`.
      */}
      <div className="grid grid-cols-7 border rounded-lg h-96 p-2">
        <p className="text-muted-foreground">Calendar grid goes here...</p>
        {/* Example of displaying a shift */}
        {shifts.map((shift) => (
          <div key={shift.id} onClick={() => handleEditShift(shift)}>
            {shift.title}
          </div>
        ))}
      </div>

      <ShiftEditorDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        shift={selectedShift ? adaptToShiftLike(selectedShift) : undefined}
        orgId={orgId}
      />
    </div>
  );
}
