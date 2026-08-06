import { describe, expect, test } from "bun:test";

describe("Stripe webhook route registration", () => {
  test("exports TanStack Start Route for /api/stripe/webhook", async () => {
    const mod = await import("./webhook");
    expect(mod.Route).toBeDefined();
    expect(typeof mod.Route.options.server.handlers.POST).toBe("function");
  });
});
