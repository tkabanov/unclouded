import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Bubble 404 page (AAU). */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-muted px-4"
    >
      <div className="max-w-md space-y-4 text-center">
        <p
          className="text-6xl font-bold tracking-tight text-foreground"
        >
          404
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="text-muted-foreground">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button variant="cta" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
