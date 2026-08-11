import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Page not found — The Imposter";
    const desc = document.querySelector('meta[name="description"]');
    const prevDesc = desc?.getAttribute("content") ?? null;
    desc?.setAttribute("content", "This page doesn't exist. Head back to The Imposter to create or join a game room.");

    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector(selector);
      const prev = el?.getAttribute("content") ?? null;
      el?.setAttribute("content", value);
      return () => { if (prev !== null) el?.setAttribute("content", prev); };
    };
    const restoreOgTitle = setMeta('meta[property="og:title"]', "Page not found — The Imposter");
    const restoreOgDesc = setMeta('meta[property="og:description"]', "This page doesn't exist. Head back to The Imposter to create or join a game room.");
    const restoreOgUrl = setMeta('meta[property="og:url"]', window.location.href);
    const canonical = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute("href") ?? null;
    canonical?.setAttribute("href", window.location.href);

    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) desc?.setAttribute("content", prevDesc);
      restoreOgTitle();
      restoreOgDesc();
      restoreOgUrl();
      if (prevCanonical !== null) canonical?.setAttribute("href", prevCanonical);
      robots.remove();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
