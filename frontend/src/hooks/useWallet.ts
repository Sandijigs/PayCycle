// TODO: White Belt — useWallet hook
// Returns: address, isConnected, connect(), disconnect(), network
export function useWallet() {
  return {
    address: null as string | null,
    isConnected: false,
    connect: async () => {},
    disconnect: async () => {},
    network: "testnet",
  };
}
