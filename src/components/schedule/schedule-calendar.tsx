// src/components/schedule/schedule-calendar.tsx

"use client";

import { useState, useEffect } from "react";
import { Shift } from "@/lib/types";
import { ShiftEditorDialog } from "./shift-editor-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ScheduleCalendar() {
  const [shifts, _setShifts] = useState<Shift[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>(undefined);

  // TODO: Fetch shifts from the API in a useEffect hook
  useEffect(() => {
    // fetch(`/api/shifts?orgId=...&week=...`)
    //   .then(res => res.json())
    //   .then(data => setShifts(data));
  }, []);

  const handleAddShift = () => {
    setSelectedShift(undefined);
    setIsDialogOpen(true);
  };

  const handleEditShift = (shift: Shift) => {
    setSelectedShift(shift);
    setIsDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddShift}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Shift
        </Button>
      </div>
      
      {/* This is where you will build your calendar grid.
        Map over the `shifts` state to display them.
        Each shift should have an `onClick` that calls `handleEditShift(shift)`.
      */}
      <div className="grid grid-cols-7 border rounded-lg h-96 p-2">
        <p className="text-muted-foreground">Calendar grid goes here...</p>
        {/* Example of displaying a shift */}
        {shifts.map(shift => (
          <div key={shift.id} onClick={() => handleEditShift(shift)}>
            {shift.title}
          </div>
        ))}
      </div>

      <ShiftEditorDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        shift={selectedShift}
        orgId={orgId} // This needs to be passed down from props
      />
    </div>
  );
}
