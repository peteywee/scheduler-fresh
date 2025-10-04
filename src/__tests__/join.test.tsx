import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JoinPage from "@/app/join/page";

// Mock Next.js hooks
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  redirect: vi.fn(),
}));

describe("Join Page", () => {
  it("renders join form", async () => {
    const component = await JoinPage();
    render(component);
    expect(screen.getByText("Join Your Team")).toBeDefined();
  });
});
