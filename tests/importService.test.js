import { beforeEach, test, expect, vi } from "vitest";

vi.mock("../src/storage.js", () => ({
  loadTransactions: vi.fn(),
  saveTransactions: vi.fn()
}));

import { importMessages } from "../src/importService.js";
import {
  loadTransactions,
  saveTransactions
} from "../src/storage.js";

const AIRTIME =
  "Yello. Payment of ZMW 9.00 to Airtime successful at " +
  "2026-10-08 09:40:03. Your new balance: 91.00 ZMW. " +
  "Financial Transaction ID: 10000000001.";

const RECEIVED =
  "Yello.You have received ZMW 50.00 from EXAMPLE SENDER " +
  "on your mobile money account at 2026-10-08 10:30:00. " +
  "Your new balance: 141.00 ZMW. " +
  "Financial Transaction ID: 10000000002.";

const WITHOUT_ID =
  "Yello. Payment of ZMW 5.00 to Example Shop successful at " +
  "2026-10-08 11:00:00. Your new balance: 136.00 ZMW.";

let savedTransactions;

beforeEach(() => {
  vi.resetAllMocks();
  savedTransactions = [];

  loadTransactions.mockImplementation(async () =>
    structuredClone(savedTransactions)
  );

  saveTransactions.mockImplementation(async (transactions) => {
    savedTransactions = structuredClone(transactions);
  });
});

test("saves new parsed and categorized transactions", async () => {
  const result = await importMessages(AIRTIME + "\n" + RECEIVED);

  expect(result).toMatchObject({
    messagesRead: 2,
    previouslySaved: 0,
    added: 2,
    duplicates: 0,
    totalSaved: 2,
    failed: [],
    needsReview: []
  });

  expect(saveTransactions).toHaveBeenCalledTimes(1);

  expect(savedTransactions[0]).toMatchObject({
    referenceCode: "10000000001",
    amount: 900,
    category: "Airtime",
    countsAsExpense: true
  });

  expect(savedTransactions[1]).toMatchObject({
    referenceCode: "10000000002",
    amount: 5000,
    category: "Money Received",
    countsAsExpense: false
  });

  for (const transaction of savedTransactions) {
    expect(transaction).not.toHaveProperty("sourceLine");
    expect(transaction.importedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(transaction.importedAt))).toBe(false);
  }
});

test("reimporting messages does not add duplicates or rewrite storage", async () => {
  const messages = AIRTIME + "\n" + RECEIVED;

  await importMessages(messages);
  const before = structuredClone(savedTransactions);
  saveTransactions.mockClear();

  const result = await importMessages(messages);

  expect(result).toMatchObject({
    previouslySaved: 2,
    added: 0,
    duplicates: 2,
    totalSaved: 2
  });

  expect(result.addedTransactions).toEqual([]);
  expect(saveTransactions).not.toHaveBeenCalled();
  expect(savedTransactions).toEqual(before);
});

test("skips repeated messages within one import", async () => {
  const result = await importMessages(AIRTIME + "\n" + AIRTIME);

  expect(result.added).toBe(1);
  expect(result.duplicates).toBe(1);
  expect(savedTransactions).toHaveLength(1);
});

test("preserves user corrections when adding new transactions", async () => {
  await importMessages(AIRTIME);

  savedTransactions[0] = {
    ...savedTransactions[0],
    category: "Other",
    categorySource: "user",
    needsCategoryReview: false,
    countsAsExpense: false,
    reviewedAt: "2026-10-09T10:00:00.000Z"
  };

  const reviewed = structuredClone(savedTransactions[0]);

  const result = await importMessages(AIRTIME + "\n" + RECEIVED);

  expect(result.added).toBe(1);
  expect(result.duplicates).toBe(1);
  expect(savedTransactions).toHaveLength(2);
  expect(savedTransactions[0]).toEqual(reviewed);
});

test("reports invalid and missing-ID messages by original line number", async () => {
  const messages = [
    "",
    "This is not a transaction.",
    "",
    WITHOUT_ID,
    AIRTIME
  ].join("\n");

  const result = await importMessages(messages);

  expect(result.messagesRead).toBe(3);
  expect(result.added).toBe(1);

  expect(result.failed).toEqual([
    { line: 2, reason: "unsupported_or_invalid_message" }
  ]);

  expect(result.needsReview).toEqual([
    { line: 4, reason: "missing_transaction_id" }
  ]);

  expect(savedTransactions).toHaveLength(1);
  expect(savedTransactions[0].referenceCode).toBe("10000000001");
});

test("holds conflicting details without overwriting saved data", async () => {
  await importMessages(AIRTIME);

  const before = structuredClone(savedTransactions);
  saveTransactions.mockClear();

  const result = await importMessages(
    AIRTIME.replace("ZMW 9.00", "ZMW 19.00")
  );

  expect(result.added).toBe(0);
  expect(result.duplicates).toBe(0);
  expect(result.needsReview).toEqual([
    { line: 1, reason: "conflicting_transaction_details" }
  ]);

  expect(saveTransactions).not.toHaveBeenCalled();
  expect(savedTransactions).toEqual(before);
});

test("empty input does not write to storage", async () => {
  const result = await importMessages(" \n\n ");

  expect(result).toMatchObject({
    messagesRead: 0,
    added: 0,
    duplicates: 0,
    totalSaved: 0,
    failed: [],
    needsReview: []
  });

  expect(saveTransactions).not.toHaveBeenCalled();
});

test.each([null, undefined, 123, {}, []])(
  "rejects non-string input: %j",
  async (input) => {
    await expect(importMessages(input)).rejects.toThrow(
      "Messages must be supplied as text."
    );

    expect(loadTransactions).not.toHaveBeenCalled();
    expect(saveTransactions).not.toHaveBeenCalled();
  }
);

test("surfaces a read error without saving", async () => {
  loadTransactions.mockRejectedValueOnce(new Error("Read failed"));

  await expect(importMessages(AIRTIME)).rejects.toThrow("Read failed");
  expect(saveTransactions).not.toHaveBeenCalled();
});

test("surfaces a save error instead of reporting success", async () => {
  saveTransactions.mockRejectedValueOnce(new Error("Save failed"));

  await expect(importMessages(AIRTIME)).rejects.toThrow("Save failed");
  expect(saveTransactions).toHaveBeenCalledTimes(1);
  expect(savedTransactions).toEqual([]);
});

test("concurrent imports preserve both new transactions", async () => {
  const results = await Promise.all([
    importMessages(AIRTIME),
    importMessages(RECEIVED)
  ]);

  expect(results.map((result) => result.added)).toEqual([1, 1]);
  expect(savedTransactions).toHaveLength(2);

  expect(
    savedTransactions.map((transaction) => transaction.referenceCode)
  ).toEqual(["10000000001", "10000000002"]);
});

test("concurrent copies of one message are saved only once", async () => {
  const results = await Promise.all([
    importMessages(AIRTIME),
    importMessages(AIRTIME)
  ]);

  expect(results.map((result) => result.added)).toEqual([1, 0]);
  expect(results.map((result) => result.duplicates)).toEqual([0, 1]);
  expect(savedTransactions).toHaveLength(1);
  expect(saveTransactions).toHaveBeenCalledTimes(1);
});