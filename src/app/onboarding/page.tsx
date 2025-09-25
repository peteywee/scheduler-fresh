"use client";

import React, { useState } from "react";
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

interface StepProps {
  onNext?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

function WelcomeStep({ onNext }: StepProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <CalendarCheck className="h-16 w-16 text-primary mx-auto mb-4" />
        </div>
        <CardTitle className="text-2xl">Welcome to Fresh Schedules!</CardTitle>
        <CardDescription className="text-lg">
          Let's get you set up with your team's scheduling system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Fresh Schedules helps you manage employee schedules, coordinate
            shifts, and keep your team organized with AI-powered conflict
            detection.
          </p>

          <div className="grid md:grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Smart Scheduling
              </h4>
              <p className="text-sm text-muted-foreground">
                Create and manage schedules with drag-and-drop simplicity
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Team Collaboration
              </h4>
              <p className="text-sm text-muted-foreground">
                Let staff request time off and swap shifts with approval
                workflows
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                AI Conflict Detection
              </h4>
              <p className="text-sm text-muted-foreground">
                Automatically detect scheduling conflicts and availability
                issues
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Multi-Organization
              </h4>
              <p className="text-sm text-muted-foreground">
                Support for users working across multiple organizations
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button onClick={onNext} size="lg">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ChoiceStep({
  onNext,
}: StepProps & { onChoice: (choice: "create" | "join") => void }) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          How would you like to get started?
        </CardTitle>
        <CardDescription>
          Choose whether to create a new organization or join an existing one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => (onNext as any)("create")}
          >
            <CardHeader className="text-center">
              <Plus className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Create Organization</CardTitle>
              <CardDescription>
                Start fresh with a new organization and invite your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You'll become the admin</li>
                <li>• Generate invite codes for your team</li>
                <li>• Full control over settings</li>
                <li>• Perfect for new teams</li>
              </ul>
              <Button className="w-full mt-4">Create New Organization</Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => (onNext as any)("join")}
          >
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Join Organization</CardTitle>
              <CardDescription>
                Join an existing organization with an invite code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Use an invite code from your manager</li>
                <li>• Search for public organizations</li>
                <li>• Request access if needed</li>
                <li>• Start collaborating immediately</li>
              </ul>
              <Button variant="outline" className="w-full mt-4">
                Join Existing Organization
              </Button>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateOrgStep({
  onNext,
  onBack,
  isLoading,
}: StepProps & { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Organization name is required";
    }

    if (formData.name.trim().length > 100) {
      newErrors.name = "Organization name must be 100 characters or less";
    }

    if (formData.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      (onNext as any)(formData);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Create Your Organization
        </CardTitle>
        <CardDescription>
          Set up your organization and become the admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              placeholder="e.g., Acme Restaurant, Smith Medical Group"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgDescription">Description (Optional)</Label>
            <Textarea
              id="orgDescription"
              placeholder="Brief description of your organization..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={errors.description ? "border-red-500" : ""}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPublic: checked })
              }
            />
            <Label htmlFor="isPublic" className="space-y-1">
              <div>Make organization discoverable</div>
              <div className="text-sm text-muted-foreground font-normal">
                Allow people to find and request access to your organization
              </div>
            </Label>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Organization"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SuccessStep({ orgName }: { orgName: string }) {
  const router = useRouter();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <CardTitle className="text-2xl">Welcome to {orgName}!</CardTitle>
        <CardDescription className="text-lg">
          Your organization has been created successfully.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            You are now the administrator
          </Badge>

          <div className="space-y-3 text-left">
            <h4 className="font-medium">Next steps:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Invite team members using invite codes</li>
              <li>• Set up your first schedule</li>
              <li>• Configure organization settings</li>
              <li>• Explore AI-powered conflict detection</li>
            </ul>
          </div>
        </div>

        <div className="text-center space-y-3">
          <Button
            onClick={() => router.push("/dashboard")}
            size="lg"
            className="w-full"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/settings")}
            className="w-full"
          >
            Organization Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [_choice, setChoice] = useState<"create" | "join" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgName, setOrgName] = useState("");

  const handleChoice = (selectedChoice: "create" | "join") => {
    setChoice(selectedChoice);
    if (selectedChoice === "join") {
      router.push("/join");
    } else {
      setStep(2); // Go to create org step
    }
  };

  const handleCreateOrg = async (formData: any) => {
    setIsLoading(true);
    setError("");

    try {
      // Get CSRF token first
      const csrfResponse = await fetch("/api/auth/csrf");
      if (!csrfResponse.ok) {
        throw new Error("Failed to get CSRF token");
      }

      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];

      if (!csrfToken) {
        throw new Error("CSRF token not found");
      }

      // Create organization
      const response = await fetch("/api/orgs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setOrgName(data.orgName);
        setStep(3); // Go to success step
      } else {
        setError(data.error || "Failed to create organization");
      }
    } catch (err) {
      console.error("Create organization error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <ChoiceStep key="choice" onChoice={handleChoice} />,
    <CreateOrgStep
      key="create"
      onSubmit={handleCreateOrg}
      onBack={() => setStep(1)}
      isLoading={isLoading}
    />,
    <SuccessStep key="success" orgName={orgName} />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Progress indicator */}
        {step > 0 && step < 3 && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      i <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-12 h-0.5 mx-2 ${
                        i < step ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Current step */}
        {steps[step]}

        {/* Navigation help */}
        {step === 0 && (
          <div className="text-center mt-8 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
