// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SalesAssistant from "./SalesAssistant";

const { useMutation } = vi.hoisted(() => ({ useMutation: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: { salesAssistant: { recommend: { useMutation } } },
}));

vi.mock("@/components/DashboardLayout", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

afterEach(cleanup);

describe("assistente de vendas", () => {
  it("associa o rótulo Objetivo principal ao textarea", () => {
    useMutation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    render(<SalesAssistant />);

    const objective = screen.getByLabelText(/Objetivo principal/i);
    expect(objective.tagName).toBe("TEXTAREA");
    expect(objective.id).toBe("sales-objective");
  });
});
