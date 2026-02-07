// TODO: Yellow Belt — useSubscription hook
// Contract interaction methods:
// - createPlan(params) → plan_id
// - subscribe(planId, maxAmount) → subscription_id
// - executePayment(subscriptionId) → boolean
// - cancel(subscriptionId)
// - pause(subscriptionId)
// - resume(subscriptionId)
// - getPlan(planId) → PlanData
// - getSubscription(subId) → SubscriptionData
export function useSubscription() {
  return {
    createPlan: async (params: any) => 0,
    subscribe: async (planId: number, maxAmount: bigint) => 0,
    executePayment: async (subscriptionId: number) => false,
    cancel: async (subscriptionId: number) => {},
    pause: async (subscriptionId: number) => {},
    resume: async (subscriptionId: number) => {},
    isLoading: false,
    error: null as Error | null,
  };
}
