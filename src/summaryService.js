// Amounts remain integer ngwee throughout calculation.
const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lusaka", year: "numeric", month: "2-digit"
});

function localMonth(value) {
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new Error("Transaction timestamps must include a timezone.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid transaction timestamp.");
  const parts = monthFormatter.formatToParts(date);
  return parts.find(p => p.type === "year").value + "-" +
    parts.find(p => p.type === "month").value;
}

function add(a, b) {
  const result = a + b;
  if (!Number.isSafeInteger(result)) throw new Error("Summary exceeds supported amount range.");
  return result;
}

export function summarizeTransactions(transactions, { month } = {}) {
  if (!Array.isArray(transactions)) throw new TypeError("Expected a transaction array.");
  if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("Use a month in YYYY-MM format, for example 2026-10.");
  }
  const summary = {
    currency: "ZMW", month: month ?? null, count: 0,
    received: 0, outgoing: 0, withdrawals: 0,
    confirmedSpending: 0, suggestedSpending: 0,
    undecidedPayments: 0, nonExpensePayments: 0,
    needsReviewCount: 0, unknownFeeCount: 0, knownFees: 0,
    categories: []
  };
  const categories = new Map();

  for (const t of transactions) {
    const recordMonth = localMonth(t.occurredAt);
    if (month && month !== recordMonth) continue;
    if (t.currency !== "ZMW") throw new Error("Only ZMW transactions are supported.");
    if (!Number.isSafeInteger(t.amount) || t.amount < 0) throw new Error("Invalid transaction amount.");
    if (!["payment", "received", "withdrawal"].includes(t.type)) throw new Error("Unsupported transaction type.");
    if (t.direction !== (t.type === "received" ? "incoming" : "outgoing")) {
      throw new Error("Transaction direction does not match its type.");
    }
    summary.count++;
    if (t.fee == null) summary.unknownFeeCount++;
    else {
      if (!Number.isSafeInteger(t.fee) || t.fee < 0) throw new Error("Invalid fee amount.");
      summary.knownFees = add(summary.knownFees, t.fee);
    }

    const decided = typeof t.countsAsExpense === "boolean";
    const confirmed = t.needsCategoryReview === false && decided;
    if (!confirmed) summary.needsReviewCount++;
    if (t.type === "received") {
      summary.received = add(summary.received, t.amount);
      continue;
    }
    summary.outgoing = add(summary.outgoing, t.amount);
    if (t.type === "withdrawal") {
      summary.withdrawals = add(summary.withdrawals, t.amount);
      continue;
    }
    if (!decided) {
      summary.undecidedPayments = add(summary.undecidedPayments, t.amount);
    } else if (!t.countsAsExpense) {
      summary.nonExpensePayments = add(summary.nonExpensePayments, t.amount);
    } else {
      const field = confirmed ? "confirmedSpending" : "suggestedSpending";
      summary[field] = add(summary[field], t.amount);
      const name = typeof t.category === "string" && t.category.trim()
        ? t.category.trim() : "Uncategorized";
      const row = categories.get(name) ?? { category: name, confirmed: 0, suggested: 0 };
      const column = confirmed ? "confirmed" : "suggested";
      row[column] = add(row[column], t.amount);
      categories.set(name, row);
    }
  }
  summary.categories = [...categories.values()].sort((a, b) => a.category.localeCompare(b.category));
  return summary;
}