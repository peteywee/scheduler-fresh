import {
    ChevronLeft,
    ChevronRight,
    PlusCircle,
  } from "lucide-react";
  
  import { Button } from "@/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import ScheduleCalendar from "@/components/schedule/schedule-calendar";
  
  export default function DashboardPage() {
    return (
      <div className="grid flex-1 items-start gap-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous Week</span>
                </Button>
                <h2 className="text-xl font-semibold font-headline text-center">June 24 - 30, 2024</h2>
                <Button variant="outline" size="icon" className="h-7 w-7">
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next Week</span>
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline">Publish</Button>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Shift
                </Button>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Drag and drop to assign shifts. Click a shift to edit details.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScheduleCalendar />
            </CardContent>
        </Card>
      </div>
    );
  }
  