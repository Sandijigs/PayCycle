import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import ConnectButton from "@/components/wallet/ConnectButton";

export const metadata: Metadata = {
  title: "PayCycle — Recurring Payments on Stellar",
  description:
    "The subscription billing protocol for Stellar. Add recurring payments to any dApp in 50 lines of code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <Providers>
          {/* Top accent line */}
          <div className="h-[2px] gradient-brand" />

          <header className="sticky top-0 z-50 glass">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight gradient-text">
                  PayCycle
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Testnet
                </span>
              </div>
              <ConnectButton />
            </nav>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <footer className="mt-auto border-t border-border/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-5 w-5 rounded gradient-brand opacity-60" />
                  <span>PayCycle Protocol</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Built on Soroban</span>
                  <span className="text-border">|</span>
                  <span>Powered by Stellar</span>
                  <span className="text-border">|</span>
                  <a
                    href="https://github.com/YOUR_USERNAME/paycycle"
                    className="hover:text-primary transition-colors"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
