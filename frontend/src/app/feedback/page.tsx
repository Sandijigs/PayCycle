"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink } from "lucide-react";

const GOOGLE_FORM_URL = "https://forms.gle/EEbHGKuBsodKgPhz7";

export default function FeedbackPage() {
  // Auto-redirect after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      window.open(GOOGLE_FORM_URL, "_blank");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-6">
      <div className="h-16 w-16 rounded-2xl gradient-brand-subtle flex items-center justify-center mx-auto">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-2">Give Feedback</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Help us improve PayCycle. Your feedback directly shapes what we build next.
          Takes under 2 minutes.
        </p>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            You should be redirected automatically. If not, click below:
          </p>
          <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer">
            <Button className="w-full gradient-brand text-white rounded-xl h-11">
              Open Feedback Form
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        All responses are collected via Google Forms and documented in our project.
      </p>
    </div>
  );
}
