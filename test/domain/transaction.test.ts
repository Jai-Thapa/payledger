import { describe, expect, test } from "@jest/globals";
import {
  transitionTransaction,
  type Transaction,
} from "../../src/domain/transaction.js";

const authorizedTransaction: Transaction = {
  id: "transaction-1",
  amount: 100,
  currency: "USD",
  paymentToken: "tok_test_123",
  status: "authorized",
  createdAt: "2026-10-24T00:00:00.000Z",
};

describe("transaction state machine", () => {
  test("allows an authorized transaction to be captured", () => {
    const captured = transitionTransaction(authorizedTransaction, "captured");

    expect(captured.status).toBe("captured");
  });

  test("allows a captured transaction to be refunded", () => {
    const captured = transitionTransaction(authorizedTransaction, "captured");
    const refunded = transitionTransaction(captured, "refunded");

    expect(refunded.status).toBe("refunded");
  });

  test("rejects refunding an authorized transaction directly", () => {
    expect(() =>
      transitionTransaction(authorizedTransaction, "refunded"),
    ).toThrow("Cannot move transaction from authorized to refunded");
  });

  test("rejects changing a refunded transaction", () => {
    const captured = transitionTransaction(authorizedTransaction, "captured");
    const refunded = transitionTransaction(captured, "refunded");

    expect(() => transitionTransaction(refunded, "captured")).toThrow(
      "Cannot move transaction from refunded to captured",
    );
  });
    test("rejects moving a captured transaction back to authorized", () => {
    const captured = transitionTransaction(
      authorizedTransaction,
      "captured",
    );

    expect(() =>
      transitionTransaction(captured, "authorized"),
    ).toThrow("Cannot move transaction from captured to authorized");
  });
});