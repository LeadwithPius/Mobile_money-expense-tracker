import { readFile, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const privateFolder = new URL("../private/", import.meta.url);
const transactionsFile = new URL(
  "transactions.json",
  privateFolder
);

function validateTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    throw new Error("Saved transactions must be a JSON array.");
  }

  for (const transaction of transactions) {
    if (
      !transaction ||
      typeof transaction !== "object" ||
      typeof transaction.provider !== "string" ||
      typeof transaction.referenceCode !== "string" ||
      !transaction.referenceCode.trim() ||
      !Number.isSafeInteger(transaction.amount) ||
      transaction.amount < 0
    ) {
      throw new Error("The transactions file contains an invalid record.");
    }
  }
}

export async function loadTransactions() {
  let content;

  try {
    content = await readFile(transactionsFile, "utf8");
  } catch (error) {
    
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  
  const transactions = JSON.parse(content);
  validateTransactions(transactions);

  return transactions;
}

export async function saveTransactions(transactions) {
  validateTransactions(transactions);

  await mkdir(privateFolder, { recursive: true });

  const temporaryFile = new URL(
    `transactions-${randomUUID()}.tmp`,
    privateFolder
  );

  try {
    
    await writeFile(
      temporaryFile,
      JSON.stringify(transactions, null, 2) + "\n",
      { encoding: "utf8", flag: "wx", mode: 0o600 }
    );

    await rename(temporaryFile, transactionsFile);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}