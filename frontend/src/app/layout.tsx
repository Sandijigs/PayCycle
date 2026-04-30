import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "sonner";
import "./globals.css";
import Providers from "@/components/Providers";
import ErrorBoundary from "@/components/ErrorBoundary";
import ConnectButton from "@/components/wallet/ConnectButton";
import NotificationBell from "@/components/NotificationBell";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "PayCycle — Recurring Payments on Stellar",
  description:
    "Programmable recurring payments protocol on Stellar. Subscribe once, pay automatically.",
};

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plans", label: "Plans" },
  { href: "/subscribe", label: "Subscribe" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background flex flex-col">
        <Providers>
          <header className="sticky top-0 z-50 bg-background">
            <nav className="px-6 sm:px-10 h-20 flex items-center justify-between">
              <Link href="/" className="flex-shrink-0">
                <img
                  src="/logo.png"
                  alt="PayCycle"
                  className="h-10 sm:h-12 w-auto "
                />
              </Link>

              <div className="hidden sm:flex items-center gap-10">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-base font-medium text-primary/70 hover:text-primary transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <NotificationBell />
                <ConnectButton />
                <MobileNav />
              </div>
            </nav>
          </header>

          <main className="flex-1">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>

          <footer className="mt-auto">
            <div className="px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <img src="/logo.png" alt="PayCycle" className="h-7 w-auto opacity-40 " />
              <div className="flex items-center gap-4">
                <a href="https://github.com/Sandijigs/PayCycle" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
                <a href="https://forms.gle/EEbHGKuBsodKgPhz7" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Feedback</a>
              </div>
            </div>
          </footer>

          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
