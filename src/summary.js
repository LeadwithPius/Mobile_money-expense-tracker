import { loadTransactions } from "./storage.js";
import { summarizeTransactions } from "./summaryService.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1) throw new Error("Usage: npm run summary -- [YYYY-MM]");
  const summary = summarizeTransactions(await loadTransactions(), { month: args[0] });
  const money = value => (value / 100).toFixed(2);

  console.log(`\nSaved transactions — ${summary.month ?? "all months"} (Zambia time)`);
  console.log("Transactions included:", summary.count);
  console.table([
    ["Money received (not necessarily income)", summary.received],
    ["Outgoing transaction amounts (excluding fees)", summary.outgoing],
    ["Cash withdrawals (included in outgoing)", summary.withdrawals],
    ["Confirmed spending", summary.confirmedSpending],
    ["Suggested spending awaiting review", summary.suggestedSpending],
    ["Payments with undecided expense treatment", summary.undecidedPayments],
    ["Payments marked as non-expenses", summary.nonExpensePayments],
    ["Known fees (reported separately)", summary.knownFees]
  ].map(([metric, amount]) => ({ metric, amountZMW: money(amount) })));
  if (summary.categories.length) {
    console.log("Spending by category (excluding fees):");
    console.table(summary.categories.map(row => ({
      category: row.category,
      confirmedZMW: money(row.confirmed),
      suggestedZMW: money(row.suggested)
    })));
  }
  console.log("Transactions awaiting category review:", summary.needsReviewCount);
  console.log("Transactions with unknown fees:", summary.unknownFeeCount);
  console.log("Coverage: saved records only. Messages held during import are excluded.");
  console.log("These totals are not your current wallet balance. Amounts and fees are shown separately.");
  if (summary.needsReviewCount) console.log("Run npm run review to resolve pending categories.");
}

main().catch(error => {
  console.error("Summary failed:", error.message);
  process.exitCode = 1;
});