import type { RouteObject } from "react-router-dom";
import Onboarding from "@/pages/Onboarding";
import Reassessment from "@/pages/Reassessment";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Journal from "@/pages/Journal";
import Paths from "@/pages/Paths";
import PathDetail from "@/pages/PathDetail";
import Settings from "@/pages/Settings";
import Subscription from "@/pages/Subscription";

export type AppRouteMeta = {
  requiresAuth: true;
};

export type AuthenticatedRouteDef = {
  path: string;
  element: React.ReactNode;
};

/** Authenticated SPA routes — each entry carries `requiresAuth` router meta. */
export const authenticatedRouteDefs: AuthenticatedRouteDef[] = [
  { path: "/onboarding", element: <Onboarding /> },
  { path: "/reassessment", element: <Reassessment /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/chat", element: <Chat /> },
  { path: "/journal", element: <Journal /> },
  { path: "/settings", element: <Settings /> },
  { path: "/subscription", element: <Subscription /> },
  { path: "/paths", element: <Paths /> },
  { path: "/paths/:slug", element: <PathDetail /> },
];

export function toAuthenticatedRouteObjects(): RouteObject[] {
  return authenticatedRouteDefs.map((route) => ({
    path: route.path,
    element: route.element,
    handle: { requiresAuth: true } satisfies AppRouteMeta,
  }));
}
