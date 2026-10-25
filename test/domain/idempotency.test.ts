import { describe, expect, test } from "@jest/globals";
import {
  IdempotencyConflictError,
  IdempotencyStore,
} from "../../src/domain/idempotency.js";

describe("idempotency store", () => {
  test("returns the original value when a request is retried", () => {
    const store = new IdempotencyStore<string>();

    store.set("payment-123", "same-request", "transaction-1");

    expect(store.get("payment-123", "same-request")).toBe("transaction-1");
  });

  test("rejects reusing a key with different request data", () => {
    const store = new IdempotencyStore<string>();

    store.set("payment-123", "original-request", "transaction-1");

    expect(() => store.get("payment-123", "different-request")).toThrow(
      IdempotencyConflictError,
    );
  });
});