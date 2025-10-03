"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, ArrowRight, Users, Building } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [inviteCode, setInviteCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const orgId = searchParams.get("orgId");
    if (code && orgId) {
      // Support QR links that pass separate orgId and code by combining to expected format
      const combined = `${orgId}-${code}`;
      setInviteCode(combined);
      setOrgName(orgId.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()));
      return;
    }
    if (code) {
      setInviteCode(code);
      // Parse org name from code if possible
      const match = code.match(/^([a-zA-Z0-9_-]+)-([a-zA-Z0-9]+)$/);
      if (match) {
        setOrgName(match[1].replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()));
      }
    }
  }, [searchParams]);

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Get CSRF token first
      const csrfResponse = await fetch("/api/auth/csrf");
      if (!csrfResponse.ok) {
        throw new Error("Failed to get CSRF token");
      }

      const csrfToken = document.cookie
        .split("; ")
        .find(row => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];

      if (!csrfToken) {
        throw new Error("CSRF token not found");
      }

      // Join organization
      const response = await fetch("/api/orgs/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Successfully joined ${data.orgName || "organization"}!`);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(data.error || "Failed to join organization");
      }
    } catch (err) {
      console.error("Join error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchOrgs = () => {
    router.push("/discover");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <CalendarCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-headline">Fresh Schedules</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Join Your Team
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Join your organization to start managing schedules and coordinating with your team.
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {/* Invite Code Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Have an Invite Code?
              </CardTitle>
              <CardDescription>
                Enter your invite code to join your organization instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="e.g., acme-corp-abc123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="mt-1"
                />
                {orgName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Joining: {orgName}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="text-green-700">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleJoinWithCode} 
                disabled={isLoading} 
                className="w-full"
              >
                {isLoading ? "Joining..." : "Join Organization"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Separator */}
          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-3 text-sm text-muted-foreground">
                or
              </span>
            </div>
          </div>

          {/* Discovery Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Find Your Organization
              </CardTitle>
              <CardDescription>
                Search for your organization and request access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSearchOrgs} 
                variant="outline" 
                className="w-full"
              >
                Browse Organizations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • Ask your manager or admin for an invite code
              </p>
              <p className="text-sm text-muted-foreground">
                • Scan the QR code if available
              </p>
              <p className="text-sm text-muted-foreground">
                • Search for your organization name to request access
              </p>
            </CardContent>
          </Card>

          {/* Auth Links */}
          <div className="text-center space-x-4 text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Already have an account? Sign In
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/signup" className="text-primary hover:underline">
              Need an account? Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CalendarCheck className="h-8 w-8 text-primary mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}