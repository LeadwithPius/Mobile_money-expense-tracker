import { readFile } from "node:fs/promises";
import { parseMtn } from "./mtn.js";

const messagesFile = new URL(
  "../private/messages.txt",
  import.meta.url
);

async function main() {
  const content = await readFile(messagesFile, "utf8");

  // Each complete SMS must occupy one line in messages.txt.
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
    } else {
      transactions.push({
        sourceLine: message.line,
        ...transaction
      });
    }
  }

  console.log("Messages loaded:", messages.length);
  console.log("Successfully parsed:", transactions.length);
  console.log("Not parsed:", unparsedLines.length);

  console.table(
    transactions.map((transaction) => ({
      line: transaction.sourceLine,
      type: transaction.type,
      direction: transaction.direction,
      amountZMW: (transaction.amount / 100).toFixed(2),
      balanceZMW:
        transaction.balanceAfter === null
          ? "Unknown"
          : (transaction.balanceAfter / 100).toFixed(2),
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