# PayLedger

PayLedger is a small payment-processing API that demonstrates the reliability
principles behind real merchant payment systems. It models transaction
lifecycles, validates payment requests, and prevents duplicate transactions when
clients retry a request.

It uses fake payment tokens and never handles real card data.

## Why this project exists

Payment requests can be retried because of network failures, timeouts, or client
errors. A payment service must be able to distinguish a safe retry from a new
payment. PayLedger demonstrates that problem with an idempotency key and a
transaction state machine.

## Features

- TypeScript and Node.js REST API.
- Transaction lifecycle: `authorized -> captured -> refunded`.
- Rejection of invalid payment state transitions.
- Idempotency keys that return the original transaction on a safe retry.
- Conflict detection when one key is reused with different payment data.
- Zod validation for request bodies.
- Fake payment tokens instead of raw card numbers.
- Jest tests for the core payment rules.
- PostgreSQL schema for the planned persistent data model.

## How it works

```text
Client request
			|
			v
Validate input and idempotency key
			|
			v
Create or replay an authorized transaction
			|
			v
Capture or refund through allowed state transitions
```

The current MVP stores live transactions in memory so it can run immediately
without database setup. The PostgreSQL design is included in `db/schema.sql` as
the next persistence milestone.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/` | Show API status and available entry points |
| GET | `/health` | Health check |
| POST | `/transactions` | Create or safely retry a transaction |
| GET | `/transactions/:id` | Retrieve a transaction |
| POST | `/transactions/:id/captured` | Capture an authorized transaction |
| POST | `/transactions/:id/refunded` | Refund a captured transaction |

## Run locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run the automated tests:

```bash
npm test
```

Build the TypeScript project:

```bash
npm run build
```

## Try a payment in PowerShell

With the server running, open a second terminal:

```powershell
$headers = @{
	"Content-Type" = "application/json"
	"Idempotency-Key" = "checkout-001"
}

$body = '{"amount":100,"currency":"USD","paymentToken":"tok_test_123"}'

$payment = Invoke-RestMethod `
	-Method Post `
	-Uri http://localhost:3000/transactions `
	-Headers $headers `
	-Body $body

$payment
```

The transaction starts as `authorized`. Capture it:

```powershell
Invoke-RestMethod `
	-Method Post `
	-Uri "http://localhost:3000/transactions/$($payment.id)/captured"
```

Refund it:

```powershell
Invoke-RestMethod `
	-Method Post `
	-Uri "http://localhost:3000/transactions/$($payment.id)/refunded"
```

Repeat the original create request with `checkout-001`. It returns the same
transaction ID instead of creating a second transaction.

## Database design

The planned PostgreSQL model contains:

- `merchants` for merchant accounts.
- `transactions` for payment state and request details.
- `ledger_entries` for an append-only financial history.

Amounts are stored as integer minor units, such as `100` cents for `$1.00`,
instead of floating-point numbers. The schema also includes foreign keys,
status checks, indexes, and a unique merchant/idempotency-key constraint.

## Project structure

```text
src/
	domain/              Payment rules and idempotency logic
	server.ts            Express API and HTTP routes
test/
	domain/              Automated business-rule tests
db/
	schema.sql           PostgreSQL data model
```

## Roadmap

1. Connect the API to PostgreSQL.
2. Persist transactions and ledger entries.
3. Add JWT authentication for merchants.
4. Add Docker and GitHub Actions CI.
5. Deploy the API.
6. Add a support assistant based on the API documentation.

## Security note

This project uses test payment tokens only. It does not process, store, or
transmit real card numbers. A production payment service would use a certified
payment processor and additional security, compliance, monitoring, and access
controls.