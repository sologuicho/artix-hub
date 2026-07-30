-- Add MEMBER value to SubscriptionTier enum
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'MEMBER' BEFORE 'STUDENT';
