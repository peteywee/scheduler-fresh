"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck,
  Building,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface StepPropsBase {
  onBack?: () => void;
  isLoading?: boolean;
}

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
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Fresh Schedules helps you manage employee schedules, coordinate
            shifts, and keep your team organized with AI-powered conflict
            detection.
          </p>

          <div className="grid gap-4 text-left md:grid-cols-2">
            <div className="space-y-2 rounded-md border p-4">
              <h3 className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-primary" />
                Team Coordination
              </h3>
              <p className="text-sm text-muted-foreground">
                Centralize availability, roles, and shift coverage.
              </p>
            </div>
            <div className="space-y-2 rounded-md border p-4">
              <Building className="h-4 w-4 text-primary" />
              <h3 className="flex items-center gap-2 font-medium">
                Location & Role Aware
              </h3>
              <p className="text-sm text-muted-foreground">
                Model sites, departments, and position-specific constraints.
              </p>
            </div>
            <div className="space-y-2 rounded-md border p-4">
              <CheckCircle className="h-4 w-4 text-primary" />
              <h3 className="flex items-center gap-2 font-medium">
                Conflict Detection
              </h3>
              <p className="text-sm text-muted-foreground">
                Prevent overlaps, overtime breaches, and unqualified assignments.
              </p>
            </div>
            <div className="space-y-2 rounded-md border p-4">
              <Plus className="h-4 w-4 text-primary" />
              <h3 className="flex items-center gap-2 font-medium">
                Fast Onboarding
              </h3>
              <p className="text-sm text-muted-foreground">
                Guided setup for org, roles, and your first schedule cycle.
              </p>
            </div>
          </div>
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