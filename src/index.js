import { readFile } from "node:fs/promises";
import { parseMtn } from "./mtn.js";
import { categorizeTransaction } from "./categorizer.js";
import { deduplicateTransactions } from "./deduplicator.js";
import { loadTransactions,saveTransactions} from "./storage.js";

const messagesFile = new URL(
  "../private/messages.txt",
  import.meta.url
);

async function main() {
  const existingTransactions = await loadTransactions();

  const content = await readFile(messagesFile, "utf8");

  const messages = content
    .split(/\r?\n/)
    .map((text, index) => ({
      text: text.trim(),
      line: index + 1
    }))
    .filter(({ text }) => text.length > 0);

  const transactions = [];
  const unparsedLines = [];

  for (const message of messages) {
    const parsed = parseMtn(message.text);

    if (!parsed) {
      unparsedLines.push(message.line);
      continue;
    }

    const categorized = categorizeTransaction(parsed);

    transactions.push({
      ...categorized,
      sourceLine: message.line
    });
  }

  const {
    accepted,
    duplicates,
    needsReview
  } = deduplicateTransactions(
    transactions,
    existingTransactions
  );

  const importedAt = new Date().toISOString();

  const newTransactions = accepted.map((transaction) => {
    const { sourceLine, ...data } = transaction;

    return {
      ...data,
      importedAt
    };
  });

  const allTransactions = [
    ...existingTransactions,
    ...newTransactions
  ];

  await saveTransactions(allTransactions);

  console.log("Messages read:", messages.length);
  console.log("Previously saved:", existingTransactions.length);
  console.log("New transactions saved:", newTransactions.length);
  console.log("Duplicates skipped:", duplicates.length);
  console.log("Held for duplicate review:", needsReview.length);
  console.log("Messages not parsed:", unparsedLines.length);
  console.log("Total saved transactions:", allTransactions.length);

  console.table(
    newTransactions.map((transaction) => ({
      type: transaction.type,
      category: transaction.category,
      amountZMW: (transaction.amount / 100).toFixed(2),
      expense:
        transaction.countsAsExpense === null
          ? "Needs review"
          : transaction.countsAsExpense
            ? "Yes"
            : "No",
      categoryReview: transaction.needsCategoryReview
        ? "Yes"
        : "No",
      occurredAt: transaction.occurredAt
    }))
  );

  if (unparsedLines.length > 0) {
    console.log(
      "Check unsupported or invalid messages on lines:",
      unparsedLines.join(", ")
    );
  }

  for (const item of needsReview) {
    console.log(
      `Line ${item.transaction.sourceLine}: ${item.reason}`
    );
  }

  console.log("Saved to private/transactions.json");
}

main().catch((error) => {
  console.error("Import failed:", error.message);
  process.exitCode = 1;
});