import { readFile } from "node:fs/promises";
import { parseMtn } from "./mtn.js";
import { categorizeTransaction } from "./categorizer.js";

const messagesFile = new URL(
  "../private/messages.txt",
  import.meta.url
);

async function main() {
  const content = await readFile(messagesFile, "utf8");

 
  const messages = content
    .split(/\r?\n/)
    .map((message, index) => ({
      text: message.trim(),
      line: index + 1
    }))
    .filter((message) => message.text.length > 0);

  const transactions = [];
  const unparsedLines = [];

 for (const message of messages) {
  const transaction = parseMtn(message.text);

  if (transaction === null) {
    unparsedLines.push(message.line);
    continue;
  }

  const categorizedTransaction = categorizeTransaction(transaction);

  transactions.push({
    sourceLine: message.line,
    ...categorizedTransaction
  });
}

  console.log("Messages loaded:", messages.length);
  console.log("Successfully parsed:", transactions.length);
  console.log("Not parsed:", unparsedLines.length);

 console.table(
  transactions.map((transaction) => ({
    line: transaction.sourceLine,
    type: transaction.type,
    category: transaction.category,
    counterparty: transaction.counterparty ?? "Unknown",
    amountZMW: (transaction.amount / 100).toFixed(2),
    expense:
      transaction.countsAsExpense === null
        ? "Needs review"
        : transaction.countsAsExpense
          ? "Yes"
          : "No",
    categoryReview: transaction.needsCategoryReview ? "Yes" : "No",
    occurredAt: transaction.occurredAt,
    warnings: transaction.warnings.join(", ") || "None"
  }))
);

  if (unparsedLines.length > 0) {
    console.log(
      "Check these lines for unsupported or invalid messages:",
      unparsedLines.join(", ")
    );
  }
}

main().catch((error) => {
  console.error("Could not process messages:", error.message);
  process.exitCode = 1;
});