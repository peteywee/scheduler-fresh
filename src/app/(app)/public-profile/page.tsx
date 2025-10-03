"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PublicProfile {
  listed: boolean;
  name: string;
  city: string;
  tags: string[];
}

async function getCsrfToken(): Promise<string> {
  await fetch("/api/auth/csrf", { method: "GET", credentials: "include" });
  const token = document.cookie
    .split("; ")
    .find(row => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return token || "";
}

export default function PublicProfilePage() {
  const [profile, setProfile] = useState<PublicProfile>({
    listed: false,
    name: "",
    city: "",
    tags: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/orgs/public-profile", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to load public profile:', error);
      toast({
        title: "Error",
        description: "Failed to load public profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const csrf = await getCsrfToken();
      
      const response = await fetch("/api/orgs/public-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        credentials: "include",
        body: JSON.stringify(profile),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Public profile updated successfully",
        });
      } else {
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !profile.tags.includes(tag)) {
      setProfile(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Public Profile</h1>
        <p className="text-muted-foreground">
          Control how your organization appears in public discovery
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discovery Settings</CardTitle>
          <CardDescription>
            Make your organization discoverable to potential new members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="listed">List in Directory</Label>
              <p className="text-sm text-muted-foreground">
                Allow people to find your organization through search
              </p>
            </div>
            <Switch
              id="listed"
              checked={profile.listed}
              onCheckedChange={(checked) =>
                setProfile(prev => ({ ...prev, listed: checked }))
              }
            />
          </div>

          {profile.listed && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Your organization name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) =>
                    setProfile(prev => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a tag (e.g., restaurant, tech, healthcare)"
                  />
                  <Button onClick={addTag} disabled={!newTag.trim()}>
                    Add
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tags help people find your organization by industry or type
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {profile.listed && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              How your organization will appear in search results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold">{profile.name || "Organization Name"}</h3>
              {profile.city && (
                <p className="text-sm text-muted-foreground">{profile.city}</p>
              )}
              {profile.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}