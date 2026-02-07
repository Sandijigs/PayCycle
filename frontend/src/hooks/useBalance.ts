// TODO: White Belt — useBalance hook
// Fetches XLM balance for connected address via Horizon
// Later: add USDC + PLC token balances
export function useBalance(address: string | null) {
  return {
    xlm: null as string | null,
    usdc: null as string | null,
    plc: null as string | null,
    isLoading: false,
    error: null as Error | null,
  };
}
