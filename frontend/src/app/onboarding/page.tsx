"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Globe,
  Droplets,
  Rocket,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  { title: "Install Freighter", icon: Download },
  { title: "Switch to Testnet", icon: Globe },
  { title: "Fund Your Wallet", icon: Droplets },
  { title: "Create Your First Plan", icon: Rocket },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { address, isConnected, connect, isConnecting } = useWallet();
  const { xlm, refetch } = useBalance(address);
  const [activeStep, setActiveStep] = useState(0);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingResult, setFundingResult] = useState<string | null>(null);

  // Auto-advance based on wallet state
  useEffect(() => {
    if (isConnected && activeStep < 2) {
      // Wallet connected means Freighter is installed and on testnet
      setActiveStep(2);
    }
    if (isConnected && xlm && parseFloat(xlm) > 0 && activeStep < 3) {
      setActiveStep(3);
    }
  }, [isConnected, xlm, activeStep]);

  const handleFundWithFriendbot = async () => {
    if (!address) return;
    setIsFunding(true);
    setFundingResult(null);
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
      if (res.ok) {
        setFundingResult("success");
        setTimeout(() => refetch(), 2000);
      } else {
        setFundingResult("Account may already be funded. Check your balance!");
      }
    } catch {
      setFundingResult("Failed to reach Friendbot. Try again.");
    } finally {
      setIsFunding(false);
    }
  };

  const stepComplete = (index: number) => {
    if (index === 0) return isConnected;
    if (index === 1) return isConnected;
    if (index === 2) return isConnected && !!xlm && parseFloat(xlm) > 0;
    return false;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="secondary" className="text-xs">
          Merchant Setup
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">
          Get started with{" "}
          <span className="text-primary">PayCycle</span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Set up your wallet and create your first subscription plan in under 5 minutes.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex-1 flex items-center gap-2">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                stepComplete(i) ? "bg-primary" : i === activeStep ? "bg-primary/40" : "bg-border"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStep;
          const isDone = stepComplete(index);
          const isLocked = index > activeStep && !isDone;

          return (
            <Card
              key={step.title}
              className={`rounded-2xl transition-all duration-300 ${
                isActive
                  ? "border-primary/30"
                  : isDone
                  ? "border-accent/30 opacity-80"
                  : "border-border/50 opacity-50"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Step indicator */}
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isDone
                        ? "bg-accent/20"
                        : isActive
                        ? "bg-primary/5"
                        : "bg-muted"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-5 w-5 text-accent" />
                    ) : (
                      <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${isDone ? "text-accent" : ""}`}>
                        Step {index + 1}: {step.title}
                      </h3>
                      {isDone && (
                        <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">
                          Done
                        </Badge>
                      )}
                    </div>

                    {/* Step content — only render active or completed steps */}
                    {(isActive || isDone) && !isLocked && (
                      <div className="mt-3">
                        {index === 0 && <StepInstallFreighter isConnected={isConnected} connect={connect} isConnecting={isConnecting} />}
                        {index === 1 && <StepSwitchTestnet isConnected={isConnected} connect={connect} isConnecting={isConnecting} />}
                        {index === 2 && (
                          <StepFundWallet
                            address={address}
                            xlm={xlm}
                            isFunding={isFunding}
                            fundingResult={fundingResult}
                            onFund={handleFundWithFriendbot}
                          />
                        )}
                        {index === 3 && <StepCreatePlan onGo={() => router.push("/plans")} />}
                      </div>
                    )}
                  </div>

                  {/* Chevron for locked steps */}
                  {isLocked && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground/30 flex-shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subscriber callout */}
      <Card className="rounded-2xl border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Looking to subscribe instead?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If someone shared a plan link with you, open it directly. Otherwise,
                follow steps 1-3 above, then browse available plans.
              </p>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => router.push("/subscribe")}
              >
                Browse Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step sub-components                                                */
/* ------------------------------------------------------------------ */

function StepInstallFreighter({
  isConnected,
  connect,
  isConnecting,
}: {
  isConnected: boolean;
  connect: () => Promise<void>;
  isConnecting: boolean;
}) {
  if (isConnected) {
    return <p className="text-sm text-accent">Freighter detected and connected.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Freighter is a browser extension wallet for Stellar. Install it, create an account, then come back here.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="rounded-xl text-sm">
            <Download className="h-4 w-4 mr-2" />
            Get Freighter
            <ExternalLink className="h-3 w-3 ml-2 opacity-50" />
          </Button>
        </a>
        <Button
          className="bg-primary text-white rounded-xl text-sm"
          onClick={connect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "I've installed it — Connect Wallet"
          )}
        </Button>
      </div>
    </div>
  );
}

function StepSwitchTestnet({
  isConnected,
  connect,
  isConnecting,
}: {
  isConnected: boolean;
  connect: () => Promise<void>;
  isConnecting: boolean;
}) {
  if (isConnected) {
    return <p className="text-sm text-accent">Connected to Stellar Testnet.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        PayCycle runs on Stellar Testnet. Switch your Freighter to Testnet:
      </p>
      <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
        <li>Open the Freighter extension in your browser</li>
        <li>
          Click the <span className="font-medium text-foreground">network name</span> at the top (it may say &quot;Mainnet&quot;)
        </li>
        <li>
          Select <span className="font-medium text-foreground">&quot;Test Net&quot;</span> from the dropdown
        </li>
      </ol>
      <Button
        className="bg-primary text-white rounded-xl text-sm"
        onClick={connect}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          "I've switched — Connect Wallet"
        )}
      </Button>
    </div>
  );
}

function StepFundWallet({
  address,
  xlm,
  isFunding,
  fundingResult,
  onFund,
}: {
  address: string | null;
  xlm: string | null;
  isFunding: boolean;
  fundingResult: string | null;
  onFund: () => void;
}) {
  const funded = xlm && parseFloat(xlm) > 0;

  if (funded) {
    return (
      <p className="text-sm text-accent">
        Wallet funded with {parseFloat(xlm!).toLocaleString()} XLM. You&apos;re ready!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Stellar&apos;s Friendbot gives you free testnet XLM. One click and you&apos;re funded.
      </p>
      {address && (
        <p className="text-xs font-mono text-muted-foreground/80 break-all">
          {address}
        </p>
      )}
      <Button
        className="bg-primary text-white rounded-xl text-sm"
        onClick={onFund}
        disabled={isFunding || !address}
      >
        {isFunding ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Funding...
          </>
        ) : (
          <>
            <Droplets className="h-4 w-4 mr-2" />
            Fund with Friendbot
          </>
        )}
      </Button>
      {fundingResult && (
        <p
          className={`text-sm ${
            fundingResult === "success" ? "text-accent" : "text-muted-foreground"
          }`}
        >
          {fundingResult === "success"
            ? "Funded! Balance will update in a moment..."
            : fundingResult}
        </p>
      )}
    </div>
  );
}

function StepCreatePlan({ onGo }: { onGo: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        You&apos;re all set! Head to the Plans page to create your first subscription plan.
        Once created, you&apos;ll get a shareable link to send to subscribers.
      </p>
      <Button
        className="bg-primary text-white rounded-xl text-sm"
        onClick={onGo}
      >
        <Rocket className="h-4 w-4 mr-2" />
        Create My First Plan
      </Button>
    </div>
  );
}
