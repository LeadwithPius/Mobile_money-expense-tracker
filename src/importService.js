import { parseMtn } from "./mtn.js";
import { categorizeTransaction } from "./categorizer.js";
import { deduplicateTransactions } from "./deduplicator.js";
import {loadTransactions,saveTransactions} from "./storage.js";
import { withStorageLock } from "./storageQueue.js";

async function performImport(text) {
  if (typeof text !== "string") {
    throw new TypeError("Messages must be supplied as text.");
  }

  const existingTransactions = await loadTransactions();

  const messages = text
    .split(/\r?\n/)
    .map((message, index) => ({
      text: message.trim(),
      line: index + 1
    }))
    .filter((message) => message.text.length > 0);

  const parsedTransactions = [];
  const failed = [];

  for (const message of messages) {
    const parsed = parseMtn(message.text);

    if (!parsed) {
      failed.push({
        line: message.line,
        reason: "unsupported_or_invalid_message"
      });
      continue;
    }

    const categorized = await categorizeTransaction(parsed);

    parsedTransactions.push({
      ...categorized,
      sourceLine: message.line
    });
  }

  const {
    accepted,
    duplicates,
    needsReview
  } = deduplicateTransactions(
    parsedTransactions,
    existingTransactions
  );

  const importedAt = new Date().toISOString();

  const addedTransactions = accepted.map((transaction) => {
    const { sourceLine, ...data } = transaction;

    return {
      ...data,
      importedAt
    };
  });

  const allTransactions = [
    ...existingTransactions,
    ...addedTransactions
  ];

  if (addedTransactions.length > 0) {
    await saveTransactions(allTransactions);
  }

  return {
    messagesRead: messages.length,
    previouslySaved: existingTransactions.length,
    added: addedTransactions.length,
    duplicates: duplicates.length,
    totalSaved: allTransactions.length,
    addedTransactions,
    failed,
    needsReview: needsReview.map((item) => ({
      line: item.transaction.sourceLine,
      reason: item.reason
    }))
  };
}
export function importMessages(text) {
  return withStorageLock(() => performImport(text));
}