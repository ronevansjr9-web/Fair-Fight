import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/learn")({
  component: LearnLayout,
});

/**
 * Layout route for /learn.
 *
 * WHY THIS EXISTS (fix for /learn/<slug> rendering the index body):
 * file-based routing makes `learn/$slug.tsx` a CHILD of `learn.tsx`. When
 * `/learn` was the full index page (no <Outlet/>), a request to
 * `/learn/<slug>` matched BOTH routes, so TanStack Router rendered only the
 * parent component (the index UI) while the deepest route's head metadata
 * (the guide title) still won — producing guide-specific <title> over an
 * index body. This layout renders <Outlet/> so the child (`/learn/<slug>`
 * guide, `/learn` index) actually renders.
 */
function LearnLayout() {
  return <Outlet />;
}