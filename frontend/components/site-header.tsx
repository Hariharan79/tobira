"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  className?: string;
}

/**
 * SiteHeader — wordmark on the left, theme toggle on the right. The wordmark
 * is the brand: lowercase, oversized, bold, all-black (or all-white in dark
 * mode). No decoration, no gradient. The graphic weight is the decoration.
 */
export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header className={cn("flex items-center justify-between", "px-1 py-2", className)}>
      <Wordmark />
      <ThemeToggle />
    </header>
  );
}

function Wordmark() {
  return (
    <Link
      href="/"
      aria-label="tobira — home"
      className={cn(
        "inline-block",
        "font-sans font-black tracking-tight lowercase",
        "text-2xl md:text-[28px]",
        "leading-none",
        "transition-transform duration-100 hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      tobira
      <span aria-hidden className="text-foreground">
        .
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Prevent hydration mismatch
    return <div className="h-9 w-9" aria-hidden />;
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "inline-flex items-center justify-center h-9 w-9",
        "border-2 border-foreground bg-background text-foreground",
        "transition-transform duration-100",
        "hover:-translate-x-px hover:-translate-y-px offset-shadow-sm",
        "active:translate-x-0 active:translate-y-0 active:shadow-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2.5} />
      )}
    </button>
  );
}
