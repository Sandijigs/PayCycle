// TODO: White Belt — Transaction status feedback
// States: idle, signing, submitting, success, error
// Shows tx hash link to Stellar Explorer on success
"use client";
export default function TxStatus({ status, txHash }: { status: string; txHash?: string }) {
  return (
    <div className="text-sm">
      {status === "success" && txHash && (
        <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
           className="text-cycle-primary underline" target="_blank" rel="noopener">
          View on Explorer ↗
        </a>
      )}
    </div>
  );
}
