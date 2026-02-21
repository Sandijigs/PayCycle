import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---- Mock external modules that cause CJS/ESM issues ----

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: vi.fn(),
  WalletNetwork: { TESTNET: "TESTNET", PUBLIC: "PUBLIC" },
  FREIGHTER_ID: "freighter",
  FreighterModule: vi.fn(),
  xBullModule: vi.fn(),
  LobstrModule: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  Contract: vi.fn(),
  TransactionBuilder: vi.fn(),
  BASE_FEE: "100",
  Address: vi.fn(),
  nativeToScVal: vi.fn(),
  scValToNative: vi.fn(),
  rpc: {
    Server: vi.fn(),
    assembleTransaction: vi.fn(),
    Api: { isSimulationError: vi.fn() },
  },
}));

// ---- Mock modules ----

// Mock useWallet
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockWallet = {
  kit: null,
  address: null as string | null,
  isConnected: false,
  isConnecting: false,
  connect: mockConnect,
  disconnect: mockDisconnect,
  network: "TESTNET",
};

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => mockWallet,
}));

// Mock useBalance
const mockRefetch = vi.fn();
const mockBalance = {
  xlm: null as string | null,
  usdc: null,
  plc: null,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

vi.mock("@/hooks/useBalance", () => ({
  useBalance: () => mockBalance,
}));

// Mock useSubscription
const mockCreatePlan = vi.fn();
const mockResetTx = vi.fn();
const mockSubscriptionHook = {
  createPlan: mockCreatePlan,
  subscribe: vi.fn(),
  executePayment: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getPlan: vi.fn(),
  getPlanCount: vi.fn(),
  getMerchantPlans: vi.fn(),
  getSubscription: vi.fn(),
  getUserSubscriptions: vi.fn(),
  isLoading: false,
  error: null,
  txStatus: "idle" as const,
  txHash: undefined,
  resetTx: mockResetTx,
};

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => mockSubscriptionHook,
}));

// Mock useContractQueries mutation hooks
vi.mock("@/hooks/useContractQueries", () => ({
  useCancelMutation: () => ({ mutate: vi.fn(), isPending: false }),
  usePauseMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// ---- Imports (after mocks) ----

import ConnectButton from "@/components/wallet/ConnectButton";
import CreatePlanForm from "@/components/subscription/CreatePlanForm";
import SubscriptionCard from "@/components/subscription/SubscriptionCard";

// ---- Test wrapper ----

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ---- ConnectButton Tests ----

describe("ConnectButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet.address = null;
    mockWallet.isConnected = false;
    mockWallet.isConnecting = false;
    mockBalance.xlm = null;
    mockBalance.isLoading = false;
  });

  it("renders Connect Wallet button when disconnected", () => {
    render(<ConnectButton />, { wrapper: TestWrapper });
    expect(screen.getByText("Connect Wallet")).toBeDefined();
  });

  it("calls connect when button is clicked", () => {
    render(<ConnectButton />, { wrapper: TestWrapper });
    fireEvent.click(screen.getByText("Connect Wallet"));
    expect(mockConnect).toHaveBeenCalledOnce();
  });

  it("shows Connecting... state", () => {
    mockWallet.isConnecting = true;
    render(<ConnectButton />, { wrapper: TestWrapper });
    expect(screen.getByText("Connecting...")).toBeDefined();
  });

  it("shows balance and address when connected", () => {
    mockWallet.isConnected = true;
    mockWallet.address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";
    mockBalance.xlm = "1234.56";
    render(<ConnectButton />, { wrapper: TestWrapper });
    // Balance should be displayed
    expect(screen.getByText("XLM")).toBeDefined();
    // Truncated address should show
    expect(screen.getByText("GABC...STUV")).toBeDefined();
  });

  it("shows 0 when balance is null", () => {
    mockWallet.isConnected = true;
    mockWallet.address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV";
    mockBalance.xlm = null;
    render(<ConnectButton />, { wrapper: TestWrapper });
    expect(screen.getByText("0")).toBeDefined();
  });
});

// ---- CreatePlanForm Tests ----

describe("CreatePlanForm", () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionHook.isLoading = false;
    mockSubscriptionHook.txStatus = "idle";
    mockSubscriptionHook.error = null;
  });

  it("renders step 1 with plan name input", () => {
    render(
      <CreatePlanForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: TestWrapper }
    );
    expect(screen.getByText("Create Subscription Plan")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. Pro Monthly")).toBeDefined();
    expect(screen.getByText("Step 1/3")).toBeDefined();
  });

  it("disables Next when plan name is empty", () => {
    render(
      <CreatePlanForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: TestWrapper }
    );
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.closest("button")?.disabled).toBe(true);
  });

  it("enables Next when plan name is filled", () => {
    render(
      <CreatePlanForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: TestWrapper }
    );
    const nameInput = screen.getByPlaceholderText("e.g. Pro Monthly");
    fireEvent.change(nameInput, { target: { value: "Test Plan" } });

    const nextBtn = screen.getByText("Next");
    expect(nextBtn.closest("button")?.disabled).toBe(false);
  });

  it("advances to step 2 and validates amount", () => {
    render(
      <CreatePlanForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: TestWrapper }
    );
    // Fill name and advance
    const nameInput = screen.getByPlaceholderText("e.g. Pro Monthly");
    fireEvent.change(nameInput, { target: { value: "Test Plan" } });
    fireEvent.click(screen.getByText("Next"));

    // Should be on step 2
    expect(screen.getByText("Step 2/3")).toBeDefined();
    expect(screen.getByPlaceholderText("0.00")).toBeDefined();

    // Next should be disabled with no amount
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.closest("button")?.disabled).toBe(true);

    // Fill amount and verify enabled
    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "10" } });
    expect(nextBtn.closest("button")?.disabled).toBe(false);
  });

  it("calls onCancel when Cancel is clicked", () => {
    render(
      <CreatePlanForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />,
      { wrapper: TestWrapper }
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });
});

// ---- SubscriptionCard Tests ----

describe("SubscriptionCard", () => {
  const mockOnAction = vi.fn();

  const activeSub = {
    id: 1,
    subscriber: "GABC",
    planId: 1,
    maxAmount: BigInt(15_0000000),
    status: "Active" as const,
    lastPayment: 1_000_000,
    nextPayment: Math.floor(Date.now() / 1000) + 86400 * 5,
    paymentsMade: 3,
    createdAt: 1_000_000,
  };

  const pausedSub = { ...activeSub, id: 2, status: "Paused" as const };
  const cancelledSub = { ...activeSub, id: 3, status: "Cancelled" as const };

  const plan = {
    id: 1,
    merchant: "GMERCHANT",
    token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    amount: BigInt(10_0000000),
    interval: 2_592_000,
    name: "Pro Monthly",
    status: "Active" as const,
    subscriberCount: 5,
    createdAt: 1_000_000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active subscription with Pause and Cancel buttons", () => {
    render(
      <SubscriptionCard
        subscription={activeSub}
        plan={plan}
        onActionComplete={mockOnAction}
      />,
      { wrapper: TestWrapper }
    );
    expect(screen.getByText("Pro Monthly")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
    expect(screen.getByText("Pause")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();
    expect(screen.getByText("3 payments made")).toBeDefined();
  });

  it("renders paused subscription with Resume and Cancel buttons", () => {
    render(
      <SubscriptionCard
        subscription={pausedSub}
        plan={plan}
        onActionComplete={mockOnAction}
      />,
      { wrapper: TestWrapper }
    );
    expect(screen.getByText("Paused")).toBeDefined();
    expect(screen.getByText("Resume")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("renders cancelled subscription with inactive message", () => {
    render(
      <SubscriptionCard
        subscription={cancelledSub}
        plan={plan}
        onActionComplete={mockOnAction}
      />,
      { wrapper: TestWrapper }
    );
    expect(screen.getByText("Cancelled")).toBeDefined();
    expect(screen.getByText("This subscription is no longer active")).toBeDefined();
  });

  it("shows cancel confirmation dialog when Cancel is clicked", () => {
    render(
      <SubscriptionCard
        subscription={activeSub}
        plan={plan}
        onActionComplete={mockOnAction}
      />,
      { wrapper: TestWrapper }
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Cancel Subscription?")).toBeDefined();
    expect(screen.getByText("Confirm Cancellation")).toBeDefined();
    expect(screen.getByText("Go Back")).toBeDefined();
  });
});
