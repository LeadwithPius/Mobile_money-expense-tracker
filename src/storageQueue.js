let queue = Promise.resolve();

export function withStorageLock(operation) {
  if (typeof operation !== "function") {
    return Promise.reject(
      new TypeError("A storage operation must be a function.")
    );
  }

  const result = queue.then(() => operation());

  queue = result.catch(() => undefined);

  return result;
}