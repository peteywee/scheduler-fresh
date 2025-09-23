import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Users, BotMessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const featureCards = [
  {
    icon: <CalendarCheck className="h-8 w-8 text-primary" />,
    title: "Intuitive Scheduling",
    description: "Create, manage, and publish schedules with a simple drag-and-drop interface. Keep your team in sync effortlessly.",
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Staff Management",
    description: "Empower your staff to view shifts, request swaps, and manage their time off, all subject to your approval.",
  },
  {
    icon: <BotMessageSquare className="h-8 w-8 text-primary" />,
    title: "AI Conflict Detection",
    description: "Leverage our smart AI to automatically flag potential scheduling conflicts, ensuring smooth operations.",
  },
];

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === "1");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <CalendarCheck className="h-6 w-6 text-primary" />
          <span className="sr-only">Fresh Schedules</span>
        </Link>
        <h1 className="ml-2 text-xl font-bold font-headline text-foreground">Fresh Schedules</h1>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4"
            prefetch={false}
          >
            Login
          </Link>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-secondary/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Scheduling, Simplified.
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Fresh Schedules is the ultimate tool for managing your team. From intuitive drag-and-drop scheduling to AI-powered conflict detection, we've got you covered.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  width="600"
                  height="400"
                  alt="Hero"
                  data-ai-hint={heroImage.imageHint}
                  className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                />
              )}
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Everything you need, nothing you don't.</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Focus on what matters most—your business. Let Fresh Schedules handle the complexities of staff management.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
              {featureCards.map((feature) => (
                <Card key={feature.title} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="p-3 rounded-full bg-primary/10 inline-block mb-4">
                       {feature.icon}
                    </div>
                    <CardTitle className="font-headline">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Fresh Schedules. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
