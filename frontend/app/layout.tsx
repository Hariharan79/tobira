import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const TITLE = "Tobira — read manga panel by panel";
const DESCRIPTION =
  "Tobira detects the panels in any comic page and plays them as a TikTok-style vertical feed. Drop one page, or a whole chapter. Local-first, open source.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Tobira",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Tobira",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2EFE7" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E0E" },
  ],
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
