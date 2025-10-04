"use client";

import { CalendarCheck, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <CalendarCheck className="mx-auto mb-4 h-16 w-16 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome to Fresh Schedules</CardTitle>
        <CardDescription className="text-lg">
          Let&apos;s get you set up with your team&apos;s scheduling system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 text-center sm:grid-cols-3">
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 p-3">
              <CalendarCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium">Smart Scheduling</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered conflict detection and optimization
            </p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 p-3">
              <CalendarCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium">Team Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Real-time updates and communication
            </p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 p-3">
              <CalendarCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium">Mobile Ready</h3>
            <p className="text-sm text-muted-foreground">
              Access your schedule anywhere, anytime
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h4 className="font-medium">Getting started is simple:</h4>
          <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Create or join your organization</li>
            <li>Set up your team members</li>
            <li>Start scheduling shifts</li>
          </ol>
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext} data-testid="welcome-next">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
