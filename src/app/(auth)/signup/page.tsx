"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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
import { useToast } from "@/hooks/use-toast";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15.545 6.558C16.805 5.346 18.215 4 20 4c2.67 0 4 2.24 4 5.291v.016c0 2.408-.94 4.793-2.67 6.582C18.32 18.98 15.49 20 12.001 20c-3.41 0-6.32-1.02-9.33-3.138C1.43 15.93 1.25 14.76 1.25 13.5v-1c0-3.33 1.92-5 4.83-5h.009c.34-.54.74-1.04 1.2-1.46L7.25 6l1.24-.99.75.24-.42 1.19 1.42.04.5-1.59 1.24-.99.75.24-.42 1.19 1.42.04.5-1.59 1.24-.99.75.24-.42 1.19 1.42.04.5-1.59-1.42-.05z" />
      <path d="M4.17 10.82a13.32 13.32 0 0 0-2.22 3.44c-.28.8-.28 2.22 0 3s.66 1.66 1.11 2.44" />
      <path d="M20 9.25c0 .34 0 .67-.03 1a6.83 6.83 0 0 1-.58 2.63c-.3.8-.7 1.5-1.17 2.12-.5.62-1.07 1.18-1.7 1.68-.63.5-1.32.93-2.07 1.28-1.13.5-2.38.75-3.6.75-2.25 0-4.38-.63-6.32-1.88a10.04 10.04 0 0 1-2.07-1.6c-.63-.6-1.14-1.28-1.5-2.02-.38-.74-.63-1.55-.76-2.42a8.45 8.45 0 0 1-.1-1.38V12.5c0-1.5.2-3 .6-4.38.4-.9.9-1.8 1.5-2.62s1.3-1.5 2.1-2.12c.8-.62 1.7-1.12 2.6-1.5.9-.38 1.9-.63 2.9-.63.9 0 1.8.12 2.6.37.8.25 1.6.63 2.3 1.12.7.5 1.3.1 1.9.15" />
    </svg>
  );
}

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, signUpWithEmail } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      router.push("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Success",
        description: "Signed up with Google successfully",
      });
      router.push("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to sign up with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-headline">
          Create an account
        </CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleEmailSignUp} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignUp}
          disabled={loading}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          {loading ? "Signing up..." : "Sign up with Google"}
        </Button>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
