export type TransactionStatus = "authorized" | "captured" | "refunded";

export type Transaction = {
  id: string;
  amount: number;
  currency: string;
  paymentToken: string;
  status: TransactionStatus;
  createdAt: string;
};

const allowedTransitions: Record<TransactionStatus, TransactionStatus[]> = {
  authorized: ["captured"],
  captured: ["refunded"],
  refunded: [],
};

export function transitionTransaction(
  transaction: Transaction,
  nextStatus: TransactionStatus,
): Transaction {
  if (!allowedTransitions[transaction.status].includes(nextStatus)) {
    throw new Error(
      `Cannot move transaction from ${transaction.status} to ${nextStatus}`,
    );
  }

  return { ...transaction, status: nextStatus };
}