"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import type { SubscriptionData, PlanData } from "@/types/subscription";
import { TOKENS } from "@/lib/contracts";
import { INTERVAL_LABELS, INTERVALS, type IntervalKey } from "@/types/subscription";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, DollarSign, Loader2, AlertCircle } from "lucide-react";

interface SubscriptionCardProps {
  subscription: SubscriptionData;
  plan: PlanData;
  onActionComplete: () => void;
}

export default function SubscriptionCard({
  subscription,
  plan,
  onActionComplete,
}: SubscriptionCardProps) {
  const { cancel, pause, resume, isLoading, txStatus } = useSubscription();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Resolve token info
  const tokenInfo = Object.values(TOKENS).find((t) => t.address === plan.token);
  const tokenSymbol = tokenInfo?.symbol || "TOKEN";
  const decimals = tokenInfo?.decimals || 7;

  // Format amount
  const displayAmount = (Number(plan.amount) / 10 ** decimals).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Resolve interval label
  const intervalLabel = Object.entries(INTERVALS).find(
    ([, seconds]) => seconds === plan.interval
  )?.[0] as IntervalKey | undefined;
  const intervalDisplay = intervalLabel
    ? INTERVAL_LABELS[intervalLabel].toLowerCase()
    : `${Math.round(plan.interval / 3600)}h`;

  // Format timestamps
  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return "Never";
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate next payment status
  const now = Math.floor(Date.now() / 1000);
  const isOverdue = subscription.status === "Active" && subscription.nextPayment < now;
  const daysUntil = Math.ceil((subscription.nextPayment - now) / 86400);

  // Status badge variant
  const statusVariant =
    subscription.status === "Active"
      ? "default"
      : subscription.status === "Paused"
      ? "secondary"
      : "destructive";

  // Handle actions
  const handlePause = async () => {
    try {
      await pause(subscription.id);
      onActionComplete();
    } catch (err) {
      console.error("Failed to pause:", err);
    }
  };

  const handleResume = async () => {
    try {
      await resume(subscription.id);
      onActionComplete();
    } catch (err) {
      console.error("Failed to resume:", err);
    }
  };

  const handleCancelConfirm = async () => {
    try {
      await cancel(subscription.id);
      setConfirmingCancel(false);
      onActionComplete();
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  };

  // Cancel confirmation view
  if (confirmingCancel) {
    return (
      <Card className="rounded-2xl border-destructive/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Cancel Subscription?</h3>
              <p className="text-sm text-muted-foreground">
                This will stop all future payments for {plan.name}.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setConfirmingCancel(false)}
            disabled={isLoading}
            className="flex-1"
          >
            Go Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancelConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Confirm Cancellation"
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Normal subscription view
  return (
    <Card className="rounded-2xl border-border/50 hover:border-primary/20 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Subscription #{subscription.id}
            </p>
          </div>
          <Badge variant={statusVariant}>{subscription.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount and interval */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Payment</span>
          </div>
          <p className="text-2xl font-bold">
            {displayAmount} <span className="text-lg text-muted-foreground">{tokenSymbol}</span>
          </p>
          <p className="text-sm text-muted-foreground">per {intervalDisplay}</p>
        </div>

        {/* Next payment */}
        {subscription.status === "Active" && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Next Payment</p>
              <p className="text-sm font-medium">
                {formatDate(subscription.nextPayment)}
                {isOverdue ? (
                  <span className="ml-2 text-destructive">Overdue</span>
                ) : daysUntil > 0 ? (
                  <span className="ml-2 text-muted-foreground">
                    in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="ml-2 text-accent">Due today</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Last payment and count */}
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Payment History</p>
            <p className="text-sm">
              {subscription.paymentsMade} payment{subscription.paymentsMade !== 1 ? "s" : ""} made
            </p>
            {subscription.lastPayment > 0 && (
              <p className="text-xs text-muted-foreground">
                Last: {formatDate(subscription.lastPayment)}
              </p>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {subscription.status === "Active" && (
          <>
            <Button
              variant="outline"
              onClick={handlePause}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading && txStatus === "submitting" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Pause
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmingCancel(true)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </>
        )}
        {subscription.status === "Paused" && (
          <>
            <Button
              onClick={handleResume}
              disabled={isLoading}
              className="flex-1 gradient-brand text-white"
            >
              {isLoading && txStatus === "submitting" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Resume
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmingCancel(true)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </>
        )}
        {(subscription.status === "Cancelled" || subscription.status === "Expired") && (
          <p className="text-sm text-muted-foreground text-center w-full py-2">
            This subscription is no longer active
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
