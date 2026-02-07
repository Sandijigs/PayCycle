export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Recurring Payments for Stellar
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Add subscription billing to any Stellar dApp in under 50 lines of
          code. Self-custodial, transparent, cancellable anytime.
        </p>
      </section>

      {/* TODO: White Belt — Add wallet connection + balance display here */}
      <section className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
        <p className="text-slate-600 dark:text-slate-300">
          Connect your Freighter wallet to begin. You&apos;ll need testnet XLM
          to interact with PayCycle.
        </p>
        {/* Wallet connect + balance will go here */}
      </section>

      {/* TODO: White Belt — Add "Send XLM" transaction component here */}

      {/* TODO: Orange Belt — Replace this with dashboard showing plans + subscriptions */}
    </div>
  );
}
