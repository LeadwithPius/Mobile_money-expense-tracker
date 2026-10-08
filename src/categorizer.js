const PAYMENT_RULES = [
  {
    category: "Mobile Data",
    pattern: /\b(?:mobile\s+money\s+data\s+bundle|data\s+bundles?)\b/i
  },
  {
    category: "Airtime",
    pattern: /\bairtime\b/i
  }
];

export function categorizeTransaction(transaction) {
  if (
    transaction === null ||
    typeof transaction !== "object" ||
    Array.isArray(transaction)
  ) {
    throw new TypeError("Expected a parsed transaction object.");
  }

  if (transaction.type === "withdrawal") {
    return {
      ...transaction,
      category: "Cash Withdrawal",
      categorySource: "transaction_type",
      needsCategoryReview: false,
      countsAsExpense: false
    };
  }

  if (transaction.type === "received") {
    return {
      ...transaction,
      category: "Money Received",
      categorySource: "transaction_type",
      needsCategoryReview: true,
      countsAsExpense: false
    };
  }

  if (transaction.type === "payment") {
    const counterparty =
      typeof transaction.counterparty === "string"
        ? transaction.counterparty.trim()
        : "";

    const rule = PAYMENT_RULES.find(({ pattern }) =>
      pattern.test(counterparty)
    );

    if (rule) {
      return {
        ...transaction,
        category: rule.category,
        categorySource: "rule",
        needsCategoryReview: true,
        countsAsExpense: true
      };
    }
  }


  return {
    ...transaction,
    category: "Uncategorized",
    categorySource: "fallback",
    needsCategoryReview: true,
    countsAsExpense: null
  };
}