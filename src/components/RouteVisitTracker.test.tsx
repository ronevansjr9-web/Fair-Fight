/**
 * Regression tests for the first-party page-view beacon
 * (src/components/RouteVisitTracker.tsx).
 *
 * Guards against the SSR-render crash introduced when the beacon read the
 * router's location at render time: TanStack Router's state store is a proxy
 * that throws `TypeError: No default value` when `location.pathname` /
 * `location.search` are accessed before they are populated on the server, which
 * crashed the entire SSR render (react-dom-server). The component must therefore
 * only touch the router's location from inside an effect (client-only), with no
 * render-time reads. These tests are hermetic: they use react-dom/server's
 * renderToStaticMarkup with a hand-rolled router whose location throws on any
 * access, and a pure dedupe helper — no browser, no network, no DB.
 */
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterContextProvider } from "@tanstack/react-router";
import {
  RouteVisitTracker,
  createRouteViewTracker,
} from "./RouteVisitTracker";

describe("createRouteViewTracker", () => {
  test("fires for a distinct route and dedupes repeats", () => {
    const seen: string[] = [];
    let current = "/";
    const fire = createRouteViewTracker(() => current, (r) => seen.push(r));
    fire();
    fire(); // same route — deduped
    expect(seen).toEqual(["/"]);
    current = "/learn/small-claims-court-guide";
    fire();
    expect(seen).toEqual(["/", "/learn/small-claims-court-guide"]);
    fire(); // repeat — deduped
    expect(seen).toEqual(["/", "/learn/small-claims-court-guide"]);
  });
});

describe("RouteVisitTracker SSR safety", () => {
  test("server-side render must not read router location and must not crash", () => {
    // Replicates the server store: any read of the location's fields throws,
    // exactly like TanStack Router's store proxy during SSR. If the component
    // (or a future edit) touches router location at render time, this throws and
    // the test fails — proving the beacon is safe even when location is unreadable.
    const throwingLocation = new Proxy(
      {},
      {
        get() {
          throw new Error("No default value");
        },
      },
    );
    let subscribeCalls = 0;
    const router = {
      options: {},
      state: { location: throwingLocation },
      subscribe: () => {
        subscribeCalls++;
        return () => undefined;
      },
    };

    let html = "";
    expect(() => {
      html = renderToStaticMarkup(
        <RouterContextProvider router={router as never}>
          <RouteVisitTracker />
        </RouterContextProvider>,
      );
    }).not.toThrow();

    // Renders nothing, so it must never touch the DOM during SSR.
    expect(html).toBe("");
    // Subscribing to route changes is client-only work: it must never happen
    // during a server render, and the initial landing is recorded in an effect.
    expect(subscribeCalls).toBe(0);
  });
});
