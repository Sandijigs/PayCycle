// TODO: White Belt — Display XLM balance for connected wallet
// Later: show USDC + PLC balances too
"use client";
export default function BalanceDisplay() {
  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
      <p className="text-sm text-slate-500">Balance</p>
      <p className="text-2xl font-bold">— XLM</p>
    </div>
  );
}
