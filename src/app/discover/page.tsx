"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  CalendarCheck, 
  Search, 
  Users, 
  Building, 
  ArrowRight,
  UserPlus,
  Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Organization {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  allowsRequests: boolean;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);

  useEffect(() => {
    searchOrganizations("");
  }, []);

  const searchOrganizations = async (query: string) => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      
      const response = await fetch(`/api/orgs/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setOrganizations(data.organizations || []);
      } else {
        setError(data.error || "Failed to search organizations");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchOrganizations(searchQuery);
  };

  const requestAccess = async (orgId: string) => {
    setRequestingAccess(orgId);

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

      const response = await fetch("/api/orgs/request-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ 
          orgId,
          message: "I would like to join this organization."
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show success message and update UI
        alert("Access request sent! You'll be notified when it's reviewed.");
      } else {
        alert(data.error || "Failed to request access");
      }
    } catch (err) {
      console.error("Request access error:", err);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setRequestingAccess(null);
    }
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
            Discover Organizations
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Find and request access to organizations using Fresh Schedules.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search by organization name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5" />
                    {org.name}
                  </CardTitle>
                  {org.description && (
                    <CardDescription>{org.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                  </div>

                  <div className="flex items-center gap-2">
                    {org.allowsRequests ? (
                      <Badge variant="secondary" className="text-xs">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Accepting Requests
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Invite Only
                      </Badge>
                    )}
                  </div>

                  {org.allowsRequests ? (
                    <Button 
                      onClick={() => requestAccess(org.id)}
                      disabled={requestingAccess === org.id}
                      className="w-full"
                      size="sm"
                    >
                      {requestingAccess === org.id ? (
                        "Requesting..."
                      ) : (
                        <>
                          Request Access
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      This organization requires an invite code
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {!isLoading && organizations.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Organizations Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "No organizations match your search criteria." 
                    : "No public organizations are available for discovery yet."}
                </p>
                <Button variant="outline" onClick={() => router.push("/join")}>
                  Have an invite code instead?
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="text-center space-x-4 text-sm">
            <Link href="/join" className="text-primary hover:underline">
              ← Back to Join Page
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/login" className="text-primary hover:underline">
              Sign In
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link href="/signup" className="text-primary hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}