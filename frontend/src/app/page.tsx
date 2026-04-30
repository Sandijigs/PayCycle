"use client";

import Link from "next/link";
import SendXLM from "@/components/transaction/SendXLM";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import {
  Droplets,
  Loader2,
  Shield,
  Clock,
  Zap,
  Eye,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { address, isConnected } = useWallet();
  const { xlm, refetch } = useBalance(address);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingMessage, setFundingMessage] = useState<string | null>(null);

  const handleFundWithFriendbot = async () => {
    if (!address) return;
    setIsFunding(true);
    setFundingMessage(null);
    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${address}`,
      );
      if (response.ok) {
        setFundingMessage("Successfully funded with 10,000 XLM!");
        setTimeout(() => refetch(), 2000);
      } else {
        setFundingMessage("Friendbot funding failed. Try again later.");
      }
    } catch {
      setFundingMessage("Error connecting to Friendbot");
    } finally {
      setIsFunding(false);
      setTimeout(() => setFundingMessage(null), 5000);
    }
  };

  if (isConnected) {
    return (
      <div className="max-w-md mx-auto px-6 py-8 space-y-8">
        <div className="text-center pt-4">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-base text-muted-foreground mt-1">
            Manage your plans and subscriptions from the dashboard.
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Dashboard
            </Link>
            <Link
              href="/plans"
              className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-card transition-colors"
            >
              My Plans
            </Link>
          </div>
        </div>

        {(xlm === "0" || !xlm) && (
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card">
            <div>
              <p className="text-sm font-medium">Account not funded</p>
              <p className="text-xs text-muted-foreground">
                Get free testnet XLM
              </p>
            </div>
            <button
              onClick={handleFundWithFriendbot}
              disabled={isFunding}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isFunding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Droplets className="h-3.5 w-3.5" />
              )}
              {isFunding ? "Funding..." : "Fund"}
            </button>
          </div>
        )}
        {fundingMessage && (
          <p
            className={`text-xs text-center ${fundingMessage.includes("Success") ? "text-accent" : "text-destructive"}`}
          >
            {fundingMessage}
          </p>
        )}

        <SendXLM />
      </div>
    );
  }

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="overflow-hidden">
        <div className="px-6 sm:px-10 pt-16 sm:pt-24 pb-12 grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center max-w-7xl mx-auto">
          {/* Left — copy */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 text-sm font-medium text-primary mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Recurring Payments Protocol
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]">
              Your Automated
              <br />
              Gateway to
              <br />
              <span className="text-primary">Smart Payments</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mt-8 max-w-xl leading-relaxed">
              Pre-authorized debit protocol on Stellar. Subscribe once, pay
              automatically — fully self-custodial, transparent, and cancellable
              anytime.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-10">
              <Link
                href="/onboarding"
                className="px-8 py-4 rounded-lg bg-primary text-white text-base font-semibold hover:opacity-90 transition-opacity"
              >
                Get Started Now
              </Link>
              <Link
                href="/subscribe"
                className="px-8 py-4 rounded-lg border border-border text-base font-semibold hover:bg-card transition-colors"
              >
                Browse Plans
              </Link>
            </div>
          </div>

          {/* Right — illustration */}
          <div className="hidden lg:block">
            <img
              src="/hero-illust.svg"
              alt="PayCycle — automated recurring payments"
              className="w-[440px] h-auto"
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-6 sm:px-10 pb-24">
          <div className="max-w-7xl mx-auto grid grid-cols-3 gap-8 pt-12 border-t border-border">
            {[
              { value: "$0.001", label: "Average transaction fee" },
              { value: "100%", label: "Self-custodial — your keys, your funds" },
              { value: "0.5%", label: "Transparent protocol fee" },
            ].map((stat) => (
              <div key={stat.value}>
                <p className="text-4xl sm:text-5xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-base text-muted-foreground mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="bg-card">
        <div className="px-6 sm:px-10 py-28 max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-xl">
              Three simple steps to start accepting recurring payments on Stellar.
            </p>
          </div>

          <div className="space-y-24">
            {[
              {
                step: "01",
                title: "Create a plan",
                desc: "Set your token, amount, and billing cycle. Share your unique plan link with subscribers anywhere.",
                image: "/create-a-plan.svg",
                reverse: false,
              },
              {
                step: "02",
                title: "Approve a spending cap",
                desc: "Subscribers set a maximum amount per cycle. Funds stay safely in the wallet until payment executes.",
                image: "/approve-spending.svg",
                reverse: true,
              },
              {
                step: "03",
                title: "Payments run automatically",
                desc: "The protocol executes payments on-chain each cycle. Cancel instantly with one click, anytime.",
                image: "/automatic-payment.svg",
                reverse: false,
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${item.reverse ? "lg:direction-rtl" : ""}`}
              >
                <div className={item.reverse ? "lg:order-2" : ""}>
                  <span className="text-6xl sm:text-7xl font-extrabold text-primary/15">{item.step}</span>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-6 mb-4">{item.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-md">{item.desc}</p>
                </div>
                <div className={`flex items-center justify-center ${item.reverse ? "lg:order-1" : ""}`}>
                  <div className="w-full max-w-sm rounded-2xl bg-background p-8 flex items-center justify-center">
                    <img src={item.image} alt={item.title} className="w-full h-auto max-h-[240px] object-contain" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="px-6 sm:px-10 py-28 max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
            Why PayCycle
          </h2>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl">
            Built for security, simplicity, and total transparency.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Shield, title: "Self-custodial", desc: "Your keys, your funds. No deposits or escrow. Tokens stay in your wallet at all times." },
            { icon: Zap, title: "Sub-cent fees", desc: "Transaction fees under $0.01. Micro-subscriptions that are impossible on other chains." },
            { icon: Clock, title: "Cancel anytime", desc: "One click, instant effect. No lock-in periods, no pending cancellations, no fine print." },
            { icon: Eye, title: "Full transparency", desc: "Every payment is verifiable on the Stellar ledger. Protocol fee is visible and auditable." },
          ].map((item) => (
            <div key={item.title} className="p-8 rounded-xl border border-border bg-card">
              <item.icon className="h-7 w-7 text-primary mb-5" />
              <h3 className="font-bold text-xl mb-3">{item.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Use cases ─── */}
      <section className="bg-card">
        <div className="px-6 sm:px-10 py-28 max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
            Use Cases
          </h2>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl">
            From SaaS to payroll — recurring payments for every business.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Featured card */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden flex flex-col min-h-[360px]">
            <div className="flex-1 flex items-center justify-center p-8">
              <img
                src="/multiple_business_illust.svg"
                alt="Built for multiple businesses"
                className="w-full h-auto max-h-[200px] object-contain"
              />
            </div>
            <div className="p-8 pt-2">
              <h3 className="text-2xl font-bold leading-tight">
                Built for real businesses
              </h3>
              <p className="text-base text-muted-foreground mt-3">
                Add recurring payments to any application with our protocol and smart contracts.
              </p>
            </div>
          </div>

          {/* Content cards */}
          {[
            {
              tag: "SaaS",
              title: "Subscription Services",
              desc: "Charge users on a recurring basis for software, content, or services — with fees under a cent.",
              image: "/subscription-illust.svg",
            },
            {
              tag: "Micro",
              title: "Micro-Subscriptions",
              desc: "Enable $0.50/week plans that are impossible on other chains where gas exceeds the payment.",
              image: "/e-wallet.svg",
            },
            {
              tag: "Payroll",
              title: "Automated Payroll",
              desc: "Recurring salary payments on-chain with spending caps and full employee custody of funds.",
              image: "/credit-card-payment.svg",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
              <div className="h-48 flex items-center justify-center p-6">
                <img src={card.image} alt={card.title} className="h-full w-auto object-contain" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full w-fit mb-4">
                  {card.tag}
                </span>
                <h4 className="font-bold text-lg mb-2">{card.title}</h4>
                <p className="text-base text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="bg-card border-t border-border">
        <div className="px-6 sm:px-10 py-28 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Ready to automate
            <br />
            your payments?
          </h2>
          <p className="text-xl text-muted-foreground mt-6 mb-12 max-w-lg mx-auto">
            Set up your wallet and create your first subscription plan in under 5 minutes.
          </p>
          <Link
            href="/onboarding"
            className="inline-block px-10 py-4 rounded-lg bg-primary text-white text-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
