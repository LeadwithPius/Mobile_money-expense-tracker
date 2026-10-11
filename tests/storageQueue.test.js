import { test, expect } from "vitest";
import { withStorageLock } from "../src/storageQueue.js";

test("runs storage operations in order", async () => {
  const events = [];

  let releaseFirst;
  const gate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  let signalStarted;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });

  const first = withStorageLock(async () => {
    events.push("first started");
    signalStarted();

    await gate;

    events.push("first finished");
    return "first result";
  });

  await started;

  const second = withStorageLock(async () => {
    events.push("second started");
    return "second result";
  });

  try {
    
    await Promise.resolve();

    expect(events).toEqual(["first started"]);
  } finally {
    releaseFirst();
  }

  expect(await Promise.all([first, second])).toEqual([
    "first result",
    "second result"
  ]);

  expect(events).toEqual([
    "first started",
    "first finished",
    "second started"
  ]);
});

test("a failed operation does not block the next operation", async () => {
  const failed = withStorageLock(async () => {
    throw new Error("Save failed");
  });

  const next = withStorageLock(async () => "Saved successfully");

  await expect(failed).rejects.toThrow("Save failed");
  await expect(next).resolves.toBe("Saved successfully");
});

test("rejects invalid operations", async () => {
  await expect(withStorageLock(null)).rejects.toThrow(
    "A storage operation must be a function."
  );
});