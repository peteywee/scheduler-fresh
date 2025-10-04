"use server";

/**
 * @fileOverview AI-powered conflict flagging tool for schedule management.
 *
 * - flagConflicts - Analyzes employee availability and flags potential scheduling conflicts.
 * - ConflictFlaggingInput - Input type for the flagConflicts function.
 * - ConflictFlaggingOutput - Return type for the flagConflicts function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const ConflictFlaggingInputSchema = z.object({
  employeeAvailabilityDocs: z
    .string()
    .describe(
      "A text document containing information about employee availability, including days, times, and any restrictions.",
    ),
  currentSchedule: z
    .string()
    .describe("A text document describing the current schedule."),
});
export type ConflictFlaggingInput = z.infer<typeof ConflictFlaggingInputSchema>;

const ConflictFlaggingOutputSchema = z.object({
  flaggedConflicts: z
    .string()
    .describe(
      "A summary of potential scheduling conflicts identified by the AI, including employee names, dates, times, and reasons for the conflict.",
    ),
  conflictDetails: z
    .array(z.string())
    .describe("Detailed information about each conflict"),
});
export type ConflictFlaggingOutput = z.infer<
  typeof ConflictFlaggingOutputSchema
>;

export async function flagConflicts(
  input: ConflictFlaggingInput,
): Promise<ConflictFlaggingOutput> {
  return flagConflictsFlow(input);
}

const conflictFlaggingPrompt = ai.definePrompt({
  name: "conflictFlaggingPrompt",
  input: { schema: ConflictFlaggingInputSchema },
  output: { schema: ConflictFlaggingOutputSchema },
  prompt: `You are an AI assistant designed to identify potential scheduling conflicts.

  Analyze the provided employee availability documents and the current schedule to identify any conflicts.

  Employee Availability Documents:
  {{employeeAvailabilityDocs}}

  Current Schedule:
  {{currentSchedule}}

  Identify any instances where an employee is scheduled to work at a time when they are unavailable, or any other scheduling conflicts based on the provided information. Return a summary of the conflicts, including employee names, dates, times, and reasons for the conflict. Include detailed information about each conflict in conflictDetails, each reason should be less than 20 words.
  `,
});

const flagConflictsFlow = ai.defineFlow(
  {
    name: "flagConflictsFlow",
    inputSchema: ConflictFlaggingInputSchema,
    outputSchema: ConflictFlaggingOutputSchema,
  },
  async (input) => {
    const { output } = await conflictFlaggingPrompt(input);
    return output!;
  },
);
