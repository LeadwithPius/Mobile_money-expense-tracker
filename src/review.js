// src/review.js
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {loadTransactions,saveTransactions} from "./storage.js";

const PAYMENT_CATEGORIES = [
  "Airtime",
  "Mobile Data",
  "Groceries",
  "Food & Dining",
  "Transport",
  "Utilities",
  "Rent",
  "Education",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Transfer",
  "Other"
];

const RECEIVED_CATEGORIES = [
  "Salary",
  "Business Income",
  "Gift",
  "Refund",
  "Loan Received",
  "Transfer",
  "Other Money Received"
];

function categoriesFor(transaction) {
  if (transaction.type === "received") {
    return RECEIVED_CATEGORIES;
  }

  if (transaction.type === "withdrawal") {
    return ["Cash Withdrawal"];
  }

  return PAYMENT_CATEGORIES;
}

function selectedIndex(answer, length) {
  if (!/^\d+$/.test(answer)) {
    return null;
  }

  const index = Number(answer) - 1;

  return Number.isInteger(index) && index >= 0 && index < length
    ? index
    : null;
}

async function main() {
  let transactions = await loadTransactions();

  if (transactions.length === 0) {
    console.log("No saved transactions. Run npm start first.");
    return;
  }

  const rl = createInterface({ input, output });

  async function ask(question) {
    return (await rl.question(question)).trim();
  }

  try {
    while (true) {
      const pending = transactions
        .map((transaction, index) => ({ transaction, index }))
        .filter(({ transaction }) =>
          transaction.needsCategoryReview === true ||
          transaction.countsAsExpense === null
        );

      if (pending.length === 0) {
        console.log("All saved transactions have been categorized.");
        break;
      }

      console.log("\nTransactions awaiting category review:");

      console.table(
        pending.map(({ transaction }, index) => ({
          number: index + 1,
          date: transaction.occurredAt,
          type: transaction.type,
          counterparty: transaction.counterparty ?? "Unknown",
          amountZMW: (transaction.amount / 100).toFixed(2),
          category: transaction.category,
          expense:
            transaction.countsAsExpense === null
              ? "Undecided"
              : transaction.countsAsExpense
                ? "Yes"
                : "No"
        }))
      );

      const selection = await ask(
        "Enter a transaction number, or q to quit: "
      );

      if (selection.toLowerCase() === "q") {
        break;
      }

      const choice = selectedIndex(selection, pending.length);

      if (choice === null) {
        console.log("Choose a number from the table.");
        continue;
      }

      const { transaction, index } = pending[choice];
      const categories = categoriesFor(transaction);

      console.log(
        `\nReviewing ${transaction.currency} ` +
        `${(transaction.amount / 100).toFixed(2)} — ` +
        `${transaction.counterparty ?? transaction.type}`
      );

      categories.forEach((category, categoryIndex) => {
        console.log(`${categoryIndex + 1}. ${category}`);
      });

      const categoryAnswer = await ask(
        "Choose a category number, or b to go back: "
      );

      if (categoryAnswer.toLowerCase() === "b") {
        continue;
      }

      const categoryIndex = selectedIndex(
        categoryAnswer,
        categories.length
      );

      if (categoryIndex === null) {
        console.log("Invalid category selection. No changes saved.");
        continue;
      }

      const category = categories[categoryIndex];
      let countsAsExpense = false;

      if (transaction.type === "payment") {
        let answer;

        while (true) {
          answer = (
            await ask(
              "Count this as spending? " +
              "(y = purchase/expense, n = transfer, b = back): "
            )
          ).toLowerCase();

          if (["y", "n", "b"].includes(answer)) {
            break;
          }

          console.log("Enter y, n, or b.");
        }

        if (answer === "b") {
          continue;
        }

        countsAsExpense = answer === "y";

        if (category === "Transfer" && countsAsExpense) {
          console.log(
            "Transfers are not counted as spending. " +
            "Choose another category if this was an expense."
          );
          continue;
        }
      }

      console.log("\nProposed change:");
      console.log("Category:", category);
      console.log("Counts as spending:", countsAsExpense ? "Yes" : "No");

      const confirmation = (
        await ask("Save this change? (y/n): ")
      ).toLowerCase();

      if (confirmation !== "y") {
        console.log("No changes saved.");
        continue;
      }

      const updatedTransaction = {
        ...transaction,
        category,
        categorySource: "user",
        needsCategoryReview: false,
        countsAsExpense,
        reviewedAt: new Date().toISOString()
      };

      const updatedTransactions = transactions.map(
        (savedTransaction, savedIndex) =>
          savedIndex === index
            ? updatedTransaction
            : savedTransaction
      );

      await saveTransactions(updatedTransactions);
      transactions = updatedTransactions;

      console.log("Category correction saved.");
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("Review stopped:", error.message);
  process.exitCode = 1;
});