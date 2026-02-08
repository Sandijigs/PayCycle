"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export type TxStatusType = "idle" | "signing" | "submitting" | "success" | "error";

interface TxStatusProps {
  status: TxStatusType;
  txHash?: string;
  errorMessage?: string;
}

export default function TxStatus({ status, txHash, errorMessage }: TxStatusProps) {
  if (status === "idle") {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case "signing":
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
          text: "Waiting for wallet signature...",
          badge: <Badge variant="secondary">Signing</Badge>,
          color: "border-blue-500",
        };
      case "submitting":
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />,
          text: "Broadcasting transaction to network...",
          badge: <Badge variant="secondary">Submitting</Badge>,
          color: "border-yellow-500",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          text: "Transaction successful!",
          badge: <Badge className="bg-green-500">Success</Badge>,
          color: "border-green-500",
        };
      case "error":
        return {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          text: errorMessage || "Transaction failed",
          badge: <Badge variant="destructive">Error</Badge>,
          color: "border-destructive",
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  return (
    <Card className={`border-l-4 ${config.color}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {config.badge}
            </div>
            <p className="text-sm text-foreground">{config.text}</p>

            {status === "success" && txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                className="text-sm text-primary underline hover:text-primary/80 mt-2 inline-flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Stellar Expert
                <span className="text-xs">↗</span>
              </a>
            )}

            {status === "error" && errorMessage && (
              <div className="mt-2 flex items-start gap-2 p-2 bg-destructive/10 rounded text-xs">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-destructive">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
