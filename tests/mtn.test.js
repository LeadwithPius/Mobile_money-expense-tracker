import { test, expect } from "vitest";
import { parseMtn } from "/src/mtn.js";
import {
  categorizeTransaction
} from "../src/categorizer.js";

const AIRTIME =
  " Y’ello. Payment of ZMW 9.00 to Airtime successful at " +
  "2026-10-08 09:40:03.Message:- -. Your new balance: 0.09 ZMW." +
  "Financial Transaction ID: 10000000001.";

const RECEIVED =
  "Yello.You have received ZMW 50.00 from EXAMPLE SENDER " +
  "on your mobile money account at 2026-10-08 10:30:00. " +
  "Your new balance: 59.00 ZMW. " +
  "Financial Transaction ID: 10000000002.";

const WITHDRAWAL =
  "You have withdrawn 50.00 ZMW from your mobile money account " +
  "at  on 2026-09-21 12:48:45. Your new balance:217.65 ZMW. " +
  "Financial Transaction Id: 10000000003.";

test("parses an airtime payment", () => {
  expect(parseMtn(AIRTIME)).toEqual({
    provider: "mtn",
    currency: "ZMW",
    referenceCode: "10000000001",
    type: "payment",
    direction: "outgoing",
    amount: 900,
    fee: null,
    balanceAfter: 9,
    counterparty: "Airtime",
    occurredAt: "2026-10-08T09:40:03+02:00",
    warnings: []
  });
});

test("supports straight apostrophes and thousands separators", () => {
  const message = AIRTIME
    .replace("Y’ello", "Y'ello")
    .replace("ZMW 9.00", "ZMW 1,250.50");

  expect(parseMtn(message)?.amount).toBe(125050);
});

test("supports capitalization differences", () => {
  expect(parseMtn(AIRTIME.toUpperCase())?.amount).toBe(900);
});

test("parses received money", () => {
  expect(parseMtn(RECEIVED)).toEqual({
    provider: "mtn",
    currency: "ZMW",
    referenceCode: "10000000002",
    type: "received",
    direction: "incoming",
    amount: 5000,
    fee: null,
    balanceAfter: 5900,
    counterparty: "EXAMPLE SENDER",
    occurredAt: "2026-10-08T10:30:00+02:00",
    warnings: []
  });
});

test("supports repeated currency wording in received messages", () => {
  const message = RECEIVED.replace(
    "ZMW 50.00 from",
    "ZMW 50.00 ZMW from"
  );

  expect(parseMtn(message)?.amount).toBe(5000);
});

test("parses a withdrawal without a greeting or location", () => {
  expect(parseMtn(WITHDRAWAL)).toEqual({
    provider: "mtn",
    currency: "ZMW",
    referenceCode: "10000000003",
    type: "withdrawal",
    direction: "outgoing",
    amount: 5000,
    fee: null,
    balanceAfter: 21765,
    counterparty: null,
    occurredAt: "2026-09-21T12:48:45+02:00",
    warnings: []
  });
});

test("captures a withdrawal location when present", () => {
  const message = WITHDRAWAL.replace(
    "at  on",
    "at Example Agent on"
  );

  expect(parseMtn(message)?.counterparty).toBe("Example Agent");
});

test("keeps a transaction without an ID and flags it", () => {
  const message = AIRTIME.replace(
    "Financial Transaction ID: 10000000001.",
    ""
  );

  expect(parseMtn(message)).toMatchObject({
    referenceCode: null,
    warnings: ["missing_or_invalid_transaction_id"]
  });
});

test("keeps a transaction without a balance and flags it", () => {
  const message = AIRTIME.replace(
    "Your new balance: 0.09 ZMW.",
    ""
  );

  expect(parseMtn(message)).toMatchObject({
    balanceAfter: null,
    warnings: ["missing_or_invalid_balance"]
  });
});

test("preserves a zero balance", () => {
  const message = AIRTIME.replace(
    "balance: 0.09",
    "balance: 0.00"
  );

  expect(parseMtn(message)).toMatchObject({
    balanceAfter: 0,
    warnings: []
  });
});

test.each(["1,,250.50", "12.345", "-9.00"])(
  "rejects malformed payment amount %s",
  (amount) => {
    const message = AIRTIME.replace("ZMW 9.00", `ZMW ${amount}`);

    expect(parseMtn(message)).toBeNull();
  }
);

test("rejects impossible dates", () => {
  const message = AIRTIME.replace("2026-10-08", "2026-02-30");

  expect(parseMtn(message)).toBeNull();
});

test("rejects impossible times", () => {
  const message = AIRTIME.replace("09:40:03", "25:40:03");

  expect(parseMtn(message)).toBeNull();
});

test.each([null, undefined, 123, {}, "", "hello world"])(
  "returns null for invalid or unsupported input: %j",
  (input) => {
    expect(parseMtn(input)).toBeNull();
  }
);

test("rejects an incomplete received message without a timestamp", () => {
  expect(
    parseMtn("Y’ello. You have received ZMW 50.00 from EXAMPLE SENDER.")
  ).toBeNull();
});

test("categorizes airtime as an expense", () => {
  const transaction = parseMtn(AIRTIME);

  expect(categorizeTransaction(transaction)).toMatchObject({
    category: "Airtime",
    categorySource: "rule",
    countsAsExpense: true,
    needsCategoryReview: true
  });
});

test("categorizes data bundles separately from airtime", () => {
  const message = AIRTIME.replace(
    "to Airtime",
    "to Mobile Money Data Bundle"
  );

  expect(categorizeTransaction(parseMtn(message))).toMatchObject({
    category: "Mobile Data",
    countsAsExpense: true
  });
});

test("does not count a withdrawal as spending", () => {
  expect(categorizeTransaction(parseMtn(WITHDRAWAL))).toMatchObject({
    category: "Cash Withdrawal",
    countsAsExpense: false
  });
});

test("does not count received money as spending", () => {
  expect(categorizeTransaction(parseMtn(RECEIVED))).toMatchObject({
    category: "Money Received",
    countsAsExpense: false,
    needsCategoryReview: true
  });
});

test("leaves ambiguous payments uncategorized", () => {
  const message = AIRTIME.replace("to Airtime", "to AIRTEL NFS");

  expect(categorizeTransaction(parseMtn(message))).toMatchObject({
    category: "Uncategorized",
    countsAsExpense: null,
    needsCategoryReview: true
  });
});

test("categorization does not modify the parsed transaction", () => {
  const transaction = parseMtn(AIRTIME);
  const original = { ...transaction };

  const categorized = categorizeTransaction(transaction);

  expect(transaction).toEqual(original);
  expect(categorized).not.toBe(transaction);
});