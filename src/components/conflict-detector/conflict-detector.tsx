'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { BotMessageSquare } from 'lucide-react';

import type { ConflictFlaggingOutput } from '@/ai/flows/conflict-flagging';
import { detectConflictsAction } from '@/app/actions/conflict-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const initialState: {
  result: ConflictFlaggingOutput | null;
  error: string | null;
} = {
  result: null,
  error: null,
};

const exampleAvailability = `
- John Smith: Available Mon-Fri 9am-5pm. Unavailable weekends.
- Jane Doe: Available Tue, Thu, Sat from 12pm-8pm.
- Peter Jones: Available anytime except Wednesdays before 1pm.
`.trim();

const exampleSchedule = `
- Mon: John Smith 9am-5pm, Peter Jones 2pm-10pm
- Tue: Jane Doe 1pm-9pm
- Wed: John Smith 9am-1pm
- Sat: Peter Jones 10am-6pm, Jane Doe 10am-4pm
`.trim();


export default function ConflictDetector() {
  const [state, formAction] = useFormState(detectConflictsAction, initialState);
  const [availability, setAvailability] = useState(exampleAvailability);
  const [schedule, setSchedule] = useState(exampleSchedule);

  return (
    <div className="space-y-6">
      <form action={formAction} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="availability">Employee Availability</Label>
          <Textarea
            id="availability"
            name="employeeAvailabilityDocs"
            placeholder="Paste employee availability info here..."
            className="min-h-48"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule">Current Schedule</Label>
          <Textarea
            id="schedule"
            name="currentSchedule"
            placeholder="Paste current schedule info here..."
            className="min-h-48"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="w-full md:w-auto">
            <BotMessageSquare className="mr-2 h-4 w-4" />
            Find Conflicts
          </Button>
        </div>
      </form>

      {state.result && (
        <div className="space-y-4">
          <Alert>
            <BotMessageSquare className="h-4 w-4" />
            <AlertTitle>AI Analysis Complete</AlertTitle>
            <AlertDescription>
              {state.result.flaggedConflicts}
            </AlertDescription>
          </Alert>

          {state.result.conflictDetails && state.result.conflictDetails.length > 0 && (
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>View Conflict Details</AccordionTrigger>
                    <AccordionContent>
                        <ul className="list-disc pl-5 space-y-2">
                            {state.result.conflictDetails.map((detail, index) => (
                                <li key={index}>{detail}</li>
                            ))}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
