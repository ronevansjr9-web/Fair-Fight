import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { trackPageView } from "~/lib/analytics";

/**
 * Resolve the "route" string (pathname + raw search string) from a TanStack
 * Router location for page-view tracking.
 *
 * MUST use `location.searchStr` — never `location.search`. TanStack Router's
 * `location.search` is the PARSED search-params object, and it is built with
 * `Object.create(null)` (null prototype, see `nullReplaceEqualDeep` in
 * @tanstack/router-core utils). A null-prototype object has no `toString` /
 * `valueOf`, so any string coercion — `pathname + location.search`, template
 * literals, `String(location.search)` — throws
 * `TypeError: Cannot convert object to primitive value` at runtime. This is what
 * crashed hydration on every page after the first analytics ping. Pure and
 * unit-testable without a browser.
 */
export function getLocationRoute(location: {
  pathname: string;
  searchStr: string;
}): string {
  return location.pathname + location.searchStr;
}
/**
 * Build a route-view "fire" callback that dedupes consecutive identical routes
 * and delegates the actual tracking. Pure and unit-testable without a browser.
 *
 * Returns a closure that, each time it is called, resolves the current route,
 * skips it if it equals the last one already sent, and otherwise records it and
 * calls `track(route)`. The dedupe boundary lives here so the page-view beacon
 * fires once per distinct route even when `onResolved` fires repeatedly for the
 * same navigation.
 */
export function createRouteViewTracker(
  getRoute: () => string,
  track: (route: string) => void,
): () => void {
  let lastSent: string | null = null;
  return function fire() {
    const route = getRoute();
    if (route === lastSent) return;
    lastSent = route;
    track(route);
  };
}

/**
 * First-party page-view beacon. Fires once on mount (the initial landing —
 * including direct SEO landings on a /learn guide) and again on each real route
 * transition (path + search). Fire-and-forget via sendBeacon / fetch keepalive;
 * it must never block page load or the payment path.
 *
 * SSR-SAFETY: the router's location may NOT be read during server-side render.
 * TanStack Router's state store reads through a proxy that throws
 * `TypeError: No default value` when a key (`location.pathname` /
 * `location.search`) is accessed before it is populated on the server, which
 * crashes the entire SSR render (react-dom-server). So this component only ever
 * reads the router's location from inside a `useEffect` / event handler — i.e.
 * exclusively on the client after hydration — never at render time. `useEffect`
 * never runs during server rendering, and `router.subscribe` is only registered
 * inside that effect, so there is no client-only work (and no subscribe call)
 * during SSR.
 *
 * CLIENT-SIDE: even after hydration, never string-coerce `location.search` —
 * it is the parsed search-params object built with a null prototype (see
 * `getLocationRoute` above), and concatenation throws
 * `TypeError: Cannot convert object to primitive value`, crashing the whole
 * tree via the error boundary. Always use `location.searchStr` (a string).
 */
export function RouteVisitTracker() {
  const router = useRouter();
  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    // This effect runs only on the client, after hydration. Every router/browser
    // read below is therefore safe and can never affect server rendering.
    const fire = () => {
      const route = getLocationRoute(router.state.location);
      if (route === lastSent.current) return;
      lastSent.current = route;
      trackPageView(route);
    };
    fire(); // record the initial landing
    // Subscribe to every resolved transition (path AND search changes).
    return router.subscribe("onResolved", fire);
  }, [router]);
  return null;
}
