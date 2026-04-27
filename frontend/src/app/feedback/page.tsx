"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, Send, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const RATING_QUESTIONS = [
  { key: "ease", label: "How easy was it to create a plan or subscribe?", short: "Ease of use" },
  { key: "trust", label: "Do you trust the pre-authorized payment model?", short: "Trust level" },
  { key: "speed", label: "How was the transaction speed?", short: "Tx speed" },
] as const;

type RatingKey = (typeof RATING_QUESTIONS)[number]["key"];

export default function FeedbackPage() {
  const { address, isConnected } = useWallet();
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({ ease: 0, trust: 0, speed: 0 });
  const [missingFeature, setMissingFeature] = useState("");
  const [bugs, setBugs] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allRated = Object.values(ratings).every((v) => v > 0);
  const canSubmit = allRated && (missingFeature.trim() || bugs.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    // Build feedback message as structured text
    const message = [
      `[RATINGS] Ease: ${ratings.ease}/5 | Trust: ${ratings.trust}/5 | Speed: ${ratings.speed}/5`,
      `[MISSING] ${missingFeature.trim() || "N/A"}`,
      `[BUGS/UX] ${bugs.trim() || "N/A"}`,
    ].join("\n");

    try {
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: isConnected ? address : null,
          category: "ux",
          message,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success("Thank you for your feedback!");
      } else {
        toast.error("Failed to submit. Please try again.");
      }
    } catch {
      toast.error("Could not reach the server. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold">Thanks for your feedback!</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your input directly shapes what we build next. Every response is read and documented.
        </p>
        <Button
          variant="outline"
          className="rounded-xl mt-4"
          onClick={() => {
            setSubmitted(false);
            setRatings({ ease: 0, trust: 0, speed: 0 });
            setMissingFeature("");
            setBugs("");
          }}
        >
          Submit another response
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-brand-subtle flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Give Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Help us improve PayCycle — takes under 2 minutes
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Rate your experience</CardTitle>
          <CardDescription>1 = Poor, 5 = Excellent</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Rating questions */}
          {RATING_QUESTIONS.map((q) => (
            <div key={q.key}>
              <p className="text-sm font-medium mb-2">{q.label}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRatings((prev) => ({ ...prev, [q.key]: value }))}
                    className={`flex items-center justify-center h-10 w-10 rounded-xl border transition-all ${
                      ratings[q.key] >= value
                        ? "gradient-brand text-white border-transparent"
                        : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary"
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 ${ratings[q.key] >= value ? "fill-white" : ""}`}
                    />
                  </button>
                ))}
                {ratings[q.key] > 0 && (
                  <span className="flex items-center text-xs text-muted-foreground ml-1">
                    {ratings[q.key]}/5
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Text questions */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              What feature is missing for mainnet?
            </label>
            <textarea
              value={missingFeature}
              onChange={(e) => setMissingFeature(e.target.value)}
              placeholder="e.g. multi-token support, email notifications, analytics dashboard..."
              rows={3}
              className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Any bugs or confusing UX?
            </label>
            <textarea
              value={bugs}
              onChange={(e) => setBugs(e.target.value)}
              placeholder="e.g. the cancel button was hard to find, transaction took too long..."
              rows={3}
              className="w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Wallet badge */}
          {isConnected && address && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-mono">
                {address.slice(0, 4)}...{address.slice(-4)}
              </Badge>
              <span>Your address will be attached to this response</span>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full gradient-brand text-white rounded-xl h-11"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
