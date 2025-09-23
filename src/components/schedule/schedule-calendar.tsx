import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ShiftCard from "./shift-card";
import { mockSchedule } from "@/lib/mock-data";

const daysOfWeek = ["Mon, 24", "Tue, 25", "Wed, 26", "Thu, 27", "Fri, 28", "Sat, 29", "Sun, 30"];

export default function ScheduleCalendar() {
  return (
    <div className="grid grid-cols-8 grid-rows-[auto_1fr] border rounded-lg overflow-hidden">
      {/* Empty corner */}
      <div className="p-2 border-b border-r bg-muted/50 font-semibold">Staff</div>
      
      {/* Day headers */}
      {daysOfWeek.map((day) => (
        <div key={day} className="p-2 text-center border-b font-semibold bg-muted/50">
          {day}
        </div>
      ))}
      
      {/* Staff rows and their shifts */}
      {mockSchedule.staff.map((staffMember, staffIndex) => (
        <div key={staffMember.id} className="grid grid-cols-subgrid col-span-8 row-start-auto">
          {/* Staff member name cell */}
          <div className={`flex items-center gap-2 p-2 border-r ${staffIndex < mockSchedule.staff.length - 1 ? 'border-b' : ''}`}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={staffMember.avatarUrl} alt={staffMember.name} />
              <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{staffMember.name}</span>
          </div>
          
          {/* Shift cells for the week */}
          {daysOfWeek.map((day, dayIndex) => {
            const shiftsForDay = mockSchedule.shifts.filter(
              (shift) => shift.staffId === staffMember.id && shift.dayIndex === dayIndex
            );
            return (
              <div
                key={`${staffMember.id}-${day}`}
                className={`p-2 min-h-24 space-y-2 ${staffIndex < mockSchedule.staff.length - 1 ? 'border-b' : ''} ${dayIndex < daysOfWeek.length - 1 ? 'border-r' : ''}`}
              >
                {shiftsForDay.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
