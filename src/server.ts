import express from "express";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
	transitionTransaction,
	type Transaction,
	type TransactionStatus,
} from "./domain/transaction.js";
import { IdempotencyStore } from "./domain/idempotency.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const transactions = new Map<string, Transaction>();
const idempotencyStore = new IdempotencyStore<Transaction>();

const createTransactionSchema = z.object({
	amount: z.number().positive(),
	currency: z.string().length(3).toUpperCase(),
	paymentToken: z.string().min(1),
});

app.use(express.json());

app.get("/", (_request, response) => {
	response.json({
		name: "PayLedger API",
		status: "running",
		endpoints: ["GET /health", "POST /transactions"],
	});
});

app.get("/health", (_request, response) => {
	response.json({ status: "ok", service: "payledger-api" });
});

app.post("/transactions", (request, response) => {
	const idempotencyKey = request.header("Idempotency-Key");

	if (!idempotencyKey) {
		response.status(400).json({ error: "Idempotency-Key header is required" });
		return;
	}

	const result = createTransactionSchema.safeParse(request.body);

	if (!result.success) {
		response.status(400).json({ error: "Invalid transaction details" });
		return;
	}

	const fingerprint = JSON.stringify(result.data);

	try {
		const previousTransaction = idempotencyStore.get(
			idempotencyKey,
			fingerprint,
		);

		if (previousTransaction) {
			response.status(200).json(previousTransaction);
			return;
		}
	} catch (error) {
		response.status(409).json({ error: (error as Error).message });
		return;
	}

	const transaction: Transaction = {
		id: randomUUID(),
		...result.data,
		status: "authorized",
		createdAt: new Date().toISOString(),
	};

	transactions.set(transaction.id, transaction);
	idempotencyStore.set(idempotencyKey, fingerprint, transaction);
	response.status(201).json(transaction);
});

app.get("/transactions/:id", (request, response) => {
	const transaction = transactions.get(request.params.id);

	if (!transaction) {
		response.status(404).json({ error: "Transaction not found" });
		return;
	}

	response.json(transaction);
});

app.post("/transactions/:id/:status", (request, response) => {
	const transaction = transactions.get(request.params.id);
	const nextStatus = request.params.status as TransactionStatus;

	if (!transaction) {
		response.status(404).json({ error: "Transaction not found" });
		return;
	}

	if (nextStatus !== "captured" && nextStatus !== "refunded") {
		response.status(400).json({ error: "Unsupported transaction transition" });
		return;
	}

	try {
		const updatedTransaction = transitionTransaction(transaction, nextStatus);
		transactions.set(updatedTransaction.id, updatedTransaction);
		response.json(updatedTransaction);
	} catch (error) {
		response.status(409).json({ error: (error as Error).message });
	}
});

app.listen(port, () => {
	console.log(`PayLedger API listening on port ${port}`);
});
