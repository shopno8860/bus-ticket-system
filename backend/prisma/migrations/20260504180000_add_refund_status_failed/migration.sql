-- Refund gateway failure (e.g. SSL declined) without admin rejection semantics
ALTER TYPE "RefundStatus" ADD VALUE 'FAILED';
