import { test, expect } from "vitest";
import { summarizeTransactions } from "../src/summaryService.js";

const base = {
  currency: "ZMW", type: "payment", direction: "outgoing", amount: 900,
  fee: null, category: "Airtime", countsAsExpense: true,
  needsCategoryReview: false, occurredAt: "2026-10-08T09:40:03+02:00"
};

test("separates expenses, suggestions, undecided payments, transfers and cash", () => {
  const s = summarizeTransactions([
    base,
    { ...base, amount: 200, needsCategoryReview: true },
    { ...base, amount: 300, countsAsExpense: null, needsCategoryReview: true },
    { ...base, amount: 400, countsAsExpense: false },
    { ...base, amount: 5000, type: "withdrawal", countsAsExpense: false },
    { ...base, amount: 10000, type: "received", direction: "incoming", countsAsExpense: false }
  ]);
  expect(s).toMatchObject({
    count: 6, received: 10000, outgoing: 6800, withdrawals: 5000,
    confirmedSpending: 900, suggestedSpending: 200, undecidedPayments: 300,
    nonExpensePayments: 400, needsReviewCount: 2, unknownFeeCount: 6
  });
  expect(s.categories).toEqual([{ category: "Airtime", confirmed: 900, suggested: 200 }]);
});

test("filters months in Zambia time including UTC month boundaries", () => {
  const s = summarizeTransactions([
    { ...base, occurredAt: "2026-09-30T22:30:00Z" },
    { ...base, occurredAt: "2026-10-31T22:30:00Z" },
    { ...base, occurredAt: "2026-10-11T12:00:00.499+02:00" }
  ], { month: "2026-10" });
  expect(s.count).toBe(2);
  expect(s.confirmedSpending).toBe(1800);
});

test("reports known and unknown fees separately", () => {
  const s = summarizeTransactions([base, { ...base, fee: 25 }]);
  expect(s.knownFees).toBe(25);
  expect(s.unknownFeeCount).toBe(1);
  expect(s.confirmedSpending).toBe(1800);
});

test("does not change user corrections", () => {
  const records = [{ ...base, category: "Groceries", categorySource: "user" }];
  const before = structuredClone(records);
  expect(summarizeTransactions(records).categories[0].category).toBe("Groceries");
  expect(records).toEqual(before);
});

test("handles empty data and empty months", () => {
  expect(summarizeTransactions([])).toMatchObject({ count: 0, received: 0, categories: [] });
  expect(summarizeTransactions([base], { month: "2026-09" }).count).toBe(0);
});

test.each(["2026-13", "2026-1", "October", ""])("rejects invalid month %s", month => {
  expect(() => summarizeTransactions([base], { month })).toThrow("YYYY-MM");
});

test("rejects mixed currencies, invalid amounts and contradictory directions", () => {
  expect(() => summarizeTransactions([{ ...base, currency: "USD" }])).toThrow("ZMW");
  expect(() => summarizeTransactions([{ ...base, amount: 9.99 }])).toThrow("amount");
  expect(() => summarizeTransactions([{ ...base, direction: "incoming" }])).toThrow("direction");
  expect(() => summarizeTransactions([{ ...base, fee: -1 }])).toThrow("fee");
});

test("rejects ambiguous or invalid timestamps", () => {
  expect(() => summarizeTransactions([{ ...base, occurredAt: "2026-10-08T09:40:03" }])).toThrow("timezone");
  expect(() => summarizeTransactions([{ ...base, occurredAt: "invalidZ" }])).toThrow("timestamp");
});

test("detects integer overflow", () => {
  expect(() => summarizeTransactions([
    { ...base, amount: Number.MAX_SAFE_INTEGER }, base
  ])).toThrow("amount range");
});

test("missing review metadata is never treated as confirmed", () => {
  const s = summarizeTransactions([{ ...base, needsCategoryReview: undefined }]);
  expect(s.confirmedSpending).toBe(0);
  expect(s.suggestedSpending).toBe(900);
  expect(s.needsReviewCount).toBe(1);
});