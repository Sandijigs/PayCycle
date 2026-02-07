// TODO: White Belt — Implement wallet connect/disconnect button
// Shows "Connect Wallet" when disconnected
// Shows truncated address + "Disconnect" when connected
"use client";
export default function ConnectButton() {
  return (
    <button className="px-4 py-2 bg-cycle-primary text-white rounded-lg hover:bg-indigo-600 transition">
      Connect Wallet
    </button>
  );
}
