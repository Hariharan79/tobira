import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "tobira — read comics one panel at a time",
  description: "Drop a comic page. Tobira finds the panels and walks you through them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Toaster
            richColors={false}
            position="top-right"
            toastOptions={{
              className:
                "border-2 border-foreground bg-background text-foreground shadow-[3px_3px_0_0_var(--color-foreground)] rounded-none font-mono text-xs uppercase tracking-wider",
            }}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
