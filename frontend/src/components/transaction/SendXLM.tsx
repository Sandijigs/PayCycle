"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useBalance } from "@/hooks/useBalance";
import { Loader2 } from "lucide-react";
import TxStatus, { TxStatusType } from "./TxStatus";
import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

export default function SendXLM() {
  const { address, kit } = useWallet();
  const { xlm, refetch } = useBalance(address);

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatusType>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleSend = async () => {
    if (!address || !kit) {
      setErrorMessage("Wallet not connected");
      setTxStatus("error");
      return;
    }

    if (!destination || !amount) {
      setErrorMessage("Please fill in all fields");
      setTxStatus("error");
      return;
    }

    // Validate Stellar address
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
      setErrorMessage("Invalid destination address");
      setTxStatus("error");
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage("Invalid amount");
      setTxStatus("error");
      return;
    }

    // Check sufficient balance (leaving 1 XLM for fees and minimum balance)
    const balance = parseFloat(xlm || "0");
    if (amountNum > balance - 1) {
      setErrorMessage("Insufficient balance (reserve 1 XLM for fees)");
      setTxStatus("error");
      return;
    }

    try {
      setTxStatus("signing");
      setErrorMessage(undefined);
      setTxHash(undefined);

      // Build transaction
      const server = new StellarSdk.Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(address);

      // Check if destination account exists on the network
      let destinationExists = true;
      try {
        await server.loadAccount(destination);
      } catch {
        destinationExists = false;
      }

      const builder = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      if (destinationExists) {
        builder.addOperation(
          StellarSdk.Operation.payment({
            destination: destination,
            asset: StellarSdk.Asset.native(),
            amount: amount,
          })
        );
      } else {
        // Account doesn't exist yet — use createAccount (requires min 1 XLM)
        builder.addOperation(
          StellarSdk.Operation.createAccount({
            destination: destination,
            startingBalance: amount,
          })
        );
      }

      const transaction = builder.setTimeout(180).build();

      // Sign transaction via Freighter
      const xdr = transaction.toXDR();
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      setTxStatus("submitting");

      // Submit signed transaction
      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        NETWORK_PASSPHRASE
      );
      const result = await server.submitTransaction(signedTransaction as StellarSdk.Transaction);

      setTxStatus("success");
      setTxHash(result.hash);

      // Clear form and refetch balance
      setDestination("");
      setAmount("");
      setTimeout(() => {
        refetch();
      }, 2000);
    } catch (error: any) {
      console.error("Transaction error:", error);

      let message = "Transaction failed";
      if (error.message?.includes("user")) {
        message = "Transaction rejected by user";
      } else if (error.message?.includes("timeout")) {
        message = "Transaction timed out";
      } else if (error.response?.data?.extras?.result_codes) {
        const codes = error.response.data.extras.result_codes;
        message = `Transaction failed: ${codes.transaction || codes.operations?.[0]}`;
      } else if (error.message) {
        message = error.message;
      }

      setErrorMessage(message);
      setTxStatus("error");
    }
  };

  const isBusy = txStatus === "signing" || txStatus === "submitting";

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl gradient-brand-subtle flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M7 17l9.2-9.2M17 17V7H7"/>
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Send XLM</h3>
          <p className="text-xs text-muted-foreground">Transfer XLM on Stellar Testnet</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Destination
          </label>
          <input
            type="text"
            placeholder="G..."
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            disabled={!address || isBusy}
            className="w-full px-4 py-3 rounded-xl bg-background border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all disabled:opacity-50 font-mono"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!address || isBusy}
              step="0.01"
              min="0"
              className="w-full px-4 py-3 pr-16 rounded-xl bg-background border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all disabled:opacity-50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              XLM
            </span>
          </div>
          {xlm && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Available: <span className="font-medium text-foreground">{xlm} XLM</span>
            </p>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!address || !destination || !amount || isBusy}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-40 disabled:shadow-none"
        >
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {txStatus === "signing" ? "Signing..." : "Submitting..."}
            </>
          ) : (
            "Send XLM"
          )}
        </button>

        <TxStatus status={txStatus} txHash={txHash} errorMessage={errorMessage} />
      </div>
    </div>
  );
}
