#![allow(unused)]
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PayCycleError {
    NotAuthorized = 1,
    PlanNotFound = 2,
    SubscriptionNotFound = 3,
    InvalidStatus = 4,
    InsufficientBalance = 5,
    PaymentNotDue = 6,
    ExceedsSpendingCap = 7,
    PlanInactive = 8,
    AlreadySubscribed = 9,
    IntervalTooShort = 10,
    AmountTooLow = 11,
    AlreadyInitialized = 12,
}

// TODO: Implement at Yellow Belt
