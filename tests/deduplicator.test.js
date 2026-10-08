import { test, expect } from "vitest";
import { deduplicateTransactions } from "../src/deduplicator.js";

const transaction = {
  provider: "mtn",
  referenceCode: "TEST-001",
  currency: "ZMW",
  type: "payment",
  direction: "outgoing",
  amount: 900,
  fee: null,
  balanceAfter: 1000,
  counterparty: "Airtime",
  occurredAt: "2026-10-08T09:40:03+02:00"
};

test("accepts the first copy and skips a repeated transaction", () => {
  const result = deduplicateTransactions([
    transaction,
    { ...transaction }
  ]);

  expect(result.accepted).toHaveLength(1);
  expect(result.duplicates).toHaveLength(1);
});

test("keeps transactions with different IDs", () => {
  const result = deduplicateTransactions([
    transaction,
    { ...transaction, referenceCode: "TEST-002" }
  ]);

  expect(result.accepted).toHaveLength(2);
});

test("holds missing IDs for review", () => {
  const result = deduplicateTransactions([
    { ...transaction, referenceCode: null }
  ]);

  expect(result.accepted).toHaveLength(0);
  expect(result.needsReview[0].reason).toBe(
    "missing_transaction_id"
  );
});

test("flags conflicting details under the same ID", () => {
  const result = deduplicateTransactions([
    transaction,
    { ...transaction, amount: 1500 }
  ]);

  expect(result.accepted).toHaveLength(1);
  expect(result.duplicates).toHaveLength(0);
  expect(result.needsReview[0].reason).toBe(
    "conflicting_transaction_details"
  );
});

test("detects a transaction already saved earlier", () => {
  const result = deduplicateTransactions(
    [{ ...transaction }],
    [transaction]
  );

  expect(result.accepted).toHaveLength(0);
  expect(result.duplicates).toHaveLength(1);
});