const NUM = "(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?";

const START = /^Y['’]?ello\s*\.\s*/i;

const STAMP =
  "(?<date>\\d{4}-\\d{2}-\\d{2})\\s+" +
  "(?<time>\\d{2}:\\d{2}:\\d{2})(?=$|[\\s.])";

const PAYMENT = new RegExp(
  "^Payment\\s+of\\s+ZMW\\s+(?<amount>" + NUM + ")" +
  "\\s+to\\s+(?<party>.+?)" +
  "\\s+successful\\s+at\\s+" + STAMP,
  "i"
);

const RECEIVED = new RegExp(
  "^You\\s+have\\s+received\\s+ZMW\\s+(?<amount>" + NUM + ")" +
  "\\s+(?:ZMW\\s+)?from\\s+(?<party>.+?)" +
  "(?:\\s+on\\s+your\\s+mobile\\s+money\\s+account)?" +
  "\\s+at\\s+" + STAMP,
  "i"
);

const WITHDRAWAL = new RegExp(
  "^You\\s+have\\s+withdrawn\\s+(?<amount>" + NUM + ")" +
  "\\s+ZMW\\s+from\\s+your\\s+mobile\\s+money\\s+account" +
  "\\s+at\\s+(?:(?<party>.+?)\\s+)?on\\s+" + STAMP,
  "i"
);

const BALANCE = new RegExp(
  "\\bYour\\s+new\\s+balance\\s*:\\s*(" + NUM + ")\\s+ZMW\\b",
  "i"
);

const TX_ID =
  /\bFinancial\s+Transaction\s+ID\s*:\s*(\d+)(?=$|[\s.,;])/i;


const VALID_AMOUNT = new RegExp("^" + NUM + "$");

function toNgwee(value) {
  if (typeof value !== "string" || !VALID_AMOUNT.test(value)) {
    return null;
  }

  const cleaned = value.replace(/,/g, "");
  const [whole, fraction = ""] = cleaned.split(".");

  const amount =
    Number(whole) * 100 +
    Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(amount) ? amount : null;
}

function validTimestamp(date, time) {
  const timestamp = date + "T" + time;
  const value = new Date(timestamp + "Z");

  if (Number.isNaN(value.getTime())) {
    return false;
  }

  return value.toISOString().slice(0, 19) === timestamp;
}


export function parseMtn(text) {
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }

  const normalized = text.trim().replace(/\s+/g, " ");


const body = normalized.replace(START, "");

const payment = body.match(PAYMENT);
const received = body.match(RECEIVED);
const withdrawal = body.match(WITHDRAWAL);

const match = payment || received || withdrawal;

if (!match) {
  return null;
}


 const { amount, party, date, time } = match.groups;
 const amountNgwee = toNgwee(amount);
const counterparty = party?.trim() || null;

if (
  amountNgwee === null ||
  (!withdrawal && !counterparty) ||
  !validTimestamp(date, time)
) {
  return null;
}

  const idMatch = body.match(TX_ID);
  const balanceMatch = body.match(BALANCE);

  const referenceCode = idMatch ? idMatch[1] : null;
  const balanceAfter = balanceMatch
    ? toNgwee(balanceMatch[1])
    : null;

  const warnings = [];

  if (referenceCode === null) {
    warnings.push("missing_or_invalid_transaction_id");
  }

  if (balanceAfter === null) {
    warnings.push("missing_or_invalid_balance");
  }

  return {
    provider: "mtn",
    currency: "ZMW",
    referenceCode,
    type: payment
  ? "payment"
  : received
    ? "received"
    : "withdrawal",

direction: received ? "incoming" : "outgoing",

    amount: amountNgwee,
    fee: null,
    balanceAfter,

    counterparty,

    occurredAt: date + "T" + time + "+02:00",
    warnings
  };
}