export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key was already used with different request data");
  }
}

export class IdempotencyStore<Value> {
  private readonly entries = new Map<
    string,
    { fingerprint: string; value: Value }
  >();

  get(key: string, fingerprint: string): Value | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.fingerprint !== fingerprint) {
      throw new IdempotencyConflictError();
    }

    return entry.value;
  }

  set(key: string, fingerprint: string, value: Value): void {
    this.entries.set(key, { fingerprint, value });
  }
}