import { readFile } from "node:fs/promises";
import { importMessages } from "./importService.js";

const messagesFile = new URL(
  "../private/messages.txt",
  import.meta.url
);

async function main() {
  const text = await readFile(messagesFile, "utf8");
  const result = await importMessages(text);

  console.log("Messages read:", result.messagesRead);
  console.log("Previously saved:", result.previouslySaved);
  console.log("New transactions saved:", result.added);
  console.log("Duplicates skipped:", result.duplicates);
  console.log("Held for duplicate review:", result.needsReview.length);
  console.log("Messages not parsed:", result.failed.length);
  console.log("Total saved transactions:", result.totalSaved);

  if (result.addedTransactions.length > 0) {
    console.table(
      result.addedTransactions.map((transaction) => ({
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
  }

  for (const failure of result.failed) {
    console.log(`Line ${failure.line}: ${failure.reason}`);
  }

  for (const item of result.needsReview) {
    console.log(`Line ${item.line}: ${item.reason}`);
  }

  if (result.added > 0) {
    console.log("New transactions saved to private/transactions.json");
  } else {
    console.log("No new transactions to save.");
  }
}

main().catch((error) => {
  console.error("Import failed:", error.message);
  process.exitCode = 1;
});