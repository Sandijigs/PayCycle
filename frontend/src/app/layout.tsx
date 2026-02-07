import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* TODO: White Belt — Wrap with WalletProvider + QueryClientProvider */}
        <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-cycle-primary">
                🔄 PayCycle
              </span>
            </div>
            {/* TODO: White Belt — Add ConnectButton component here */}
            <div className="text-sm text-slate-400">Connect Wallet →</div>
          </nav>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-700 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-slate-400">
            Built on Soroban · Powered by Stellar ·{" "}
            <a
              href="https://github.com/YOUR_USERNAME/paycycle"
              className="underline"
            >
              GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
