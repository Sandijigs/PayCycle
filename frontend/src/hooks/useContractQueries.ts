"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { useWallet } from "@/hooks/useWallet";
import type { PlanData, SubscriptionData, CreatePlanParams } from "@/types/subscription";
import { toast } from "sonner";

// ---- Query key constants ----

export const queryKeys = {
  merchantPlans: (addr: string) => ["merchantPlans", addr] as const,
  allPlans: ["allPlans"] as const,
  userSubscriptions: (addr: string) => ["userSubscriptions", addr] as const,
  subscription: (id: number) => ["subscription", id] as const,
};

// ---- Query hooks ----

export function useMerchantPlans(address: string | null) {
  const { getMerchantPlans } = useSubscription();

  return useQuery({
    queryKey: queryKeys.merchantPlans(address || ""),
    queryFn: () => getMerchantPlans(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useAllActivePlans() {
  const { getPlanCount, getPlan } = useSubscription();

  return useQuery({
    queryKey: queryKeys.allPlans,
    queryFn: async (): Promise<PlanData[]> => {
      const count = await getPlanCount();
      const plans: PlanData[] = [];
      for (let i = 1; i <= count; i++) {
        try {
          const plan = await getPlan(i);
          if (plan.status === "Active") {
            plans.push(plan);
          }
        } catch {
          continue;
        }
      }
      return plans;
    },
    staleTime: 30_000,
  });
}

export function useUserSubscriptions(address: string | null) {
  const { getUserSubscriptions, getSubscription, getPlan } = useSubscription();

  return useQuery({
    queryKey: queryKeys.userSubscriptions(address || ""),
    queryFn: async (): Promise<Array<{ subscription: SubscriptionData; plan: PlanData }>> => {
      const subIds = await getUserSubscriptions(address!);
      return Promise.all(
        subIds.map(async (id) => {
          const subscription = await getSubscription(id);
          const plan = await getPlan(subscription.planId);
          return { subscription, plan };
        })
      );
    },
    enabled: !!address,
    staleTime: 15_000,
  });
}

// ---- Mutation hooks ----

export function useCreatePlanMutation() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { createPlan } = useSubscription();

  return useMutation({
    mutationFn: (params: CreatePlanParams) => createPlan(params),
    onSuccess: (_data) => {
      toast.success("Plan created successfully!");
      if (address) {
        queryClient.invalidateQueries({ queryKey: queryKeys.merchantPlans(address) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.allPlans });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create plan: ${err.message}`);
    },
  });
}

export function useSubscribeMutation() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { subscribe } = useSubscription();

  return useMutation({
    mutationFn: ({ planId, maxAmount }: { planId: number; maxAmount: bigint }) =>
      subscribe(planId, maxAmount),
    onSuccess: () => {
      toast.success("Subscribed successfully!");
      if (address) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSubscriptions(address) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.allPlans });
    },
    onError: (err: Error) => {
      toast.error(`Subscription failed: ${err.message}`);
    },
  });
}

export function useCancelMutation() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { cancel } = useSubscription();

  return useMutation({
    mutationFn: (subscriptionId: number) => cancel(subscriptionId),
    onSuccess: () => {
      toast.success("Subscription cancelled");
      if (address) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSubscriptions(address) });
      }
    },
    onError: (err: Error) => {
      toast.error(`Cancel failed: ${err.message}`);
    },
  });
}

export function usePauseMutation() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { pause } = useSubscription();

  return useMutation({
    mutationFn: (subscriptionId: number) => pause(subscriptionId),
    onSuccess: () => {
      toast.success("Subscription paused");
      if (address) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSubscriptions(address) });
      }
    },
    onError: (err: Error) => {
      toast.error(`Pause failed: ${err.message}`);
    },
  });
}

export function useResumeMutation() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { resume } = useSubscription();

  return useMutation({
    mutationFn: (subscriptionId: number) => resume(subscriptionId),
    onSuccess: () => {
      toast.success("Subscription resumed");
      if (address) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSubscriptions(address) });
      }
    },
    onError: (err: Error) => {
      toast.error(`Resume failed: ${err.message}`);
    },
  });
}
