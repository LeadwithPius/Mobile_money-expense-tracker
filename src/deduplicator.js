function transactionFacts(transaction) {
  return JSON.stringify([
    transaction.currency,
    transaction.type,
    transaction.direction,
    transaction.amount,
    transaction.fee,
    transaction.balanceAfter,
    transaction.counterparty,
    transaction.occurredAt
  ]);
}

export function deduplicateTransactions(
  transactions,
  existingTransactions = []
) {
  const seen = new Map();

  const result = {
    accepted: [],
    duplicates: [],
    needsReview: []
  };

  const keyFor = (transaction) =>
    JSON.stringify([
      transaction.provider,
      transaction.referenceCode
    ]);

  for (const transaction of existingTransactions) {
    if (transaction.referenceCode) {
      seen.set(keyFor(transaction), transaction);
    }
  }

  for (const transaction of transactions) {
    if (!transaction.referenceCode) {
      result.needsReview.push({
        transaction,
        reason: "missing_transaction_id"
      });
      continue;
    }

    const key = keyFor(transaction);
    const previous = seen.get(key);

    if (!previous) {
      seen.set(key, transaction);
      result.accepted.push(transaction);
      continue;
    }

    if (transactionFacts(previous) === transactionFacts(transaction)) {
      result.duplicates.push(transaction);
    } else {
      // Same ID but different details: do not silently discard it.
      result.needsReview.push({
        transaction,
        reason: "conflicting_transaction_details"
      });
    }
  }

  return result;
}