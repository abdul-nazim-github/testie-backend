# Testie Health Backend

Enterprise-level NestJS backend for securely ingesting, verifying, and persisting Shopify webhooks. Designed for extensibility with future integrations (Stripe, Customer.io, etc.).

## Architecture

```
src/
├── common/           # Shared filters, guards, interceptors, utils
├── config/           # Centralized configuration and env validation
├── database/         # DatabaseModule, Mongoose configuration
└── modules/
    └── shopify/      # Shopify webhook controller, service, entity, guard
```

## Prerequisites

- Node.js 20+
- MongoDB 6+
- Docker & Docker Compose (optional, for local dev)

## Installation

```bash
cp .env.example .env    # Edit with your values
npm install
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development`, `production`, `test`, `staging` |
| `PORT` | No | Server port (default: 3000) |
| `DATABASE_URI` | Yes | MongoDB Connection String URI (e.g. `mongodb://localhost:27017/testie_health`) |
| `SHOPIFY_WEBHOOK_SECRET` | Yes | Secret for HMAC webhook verification |

## Database Setup & Management

You can easily run and manage MongoDB freely using Docker or local tools:

```bash
# Start MongoDB via Docker
docker compose up -d db

# Connecting with MongoDB Compass (GUI)
# Download: https://www.mongodb.com/products/tools/compass
# URI: mongodb://localhost:27017/testie_health
```

**Important:** Mongoose handles schema generation and indexing. In production, ensure `autoIndex` is false and indexes are built manually or via CI/CD.

## Running the Application

```bash
npm run start:dev     # Development (watch mode)
npm run start:prod    # Production
```

## API Documentation

Swagger UI is available at: `http://localhost:3000/api/docs`

### Shopify Webhook Endpoint

**POST** `/shopify/webhook`

**Required Headers:**
- `x-shopify-hmac-sha256` — HMAC signature
- `x-shopify-topic` — Webhook topic (e.g., `orders/create`)
- `x-shopify-shop-domain` — Shop domain
- `x-shopify-webhook-id` — Unique webhook ID (idempotency key)

**HMAC Verification:** The raw request body is hashed with SHA256 using `SHOPIFY_WEBHOOK_SECRET` and compared to the `x-shopify-hmac-sha256` header using constant-time comparison.

**Idempotency:** Duplicate `webhook_id` values are rejected at the database level via a unique constraint. The API returns `200 OK` for duplicates to prevent Shopify retries.

## Testing

```bash
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
```

## Docker

```bash
docker compose up -d          # Start all services
docker compose up -d db       # Start only MongoDB
```

## Production Deployment Notes

- Ensure `NODE_ENV=production`
- Set real `SHOPIFY_WEBHOOK_SECRET` — never use the example value
- The Dockerfile runs as a non-root user and installs only production dependencies
