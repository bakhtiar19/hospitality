# Hotel Winotosastro PMS & Channel Manager

> Production-Grade Hotel Property Management System (PMS) & Channel Manager for the Indonesian Hospitality Market.  
> Target Property: **Hotel Winotosastro AProject, Surakarta (Solo), Central Java**.

---

## 🏨 Architecture Overview

This project is structured as a high-performance monorepo using **Turborepo** + **pnpm**:

```
.
├── apps/
│   ├── web/        # Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Virtual
│   ├── api/        # NestJS Modular Monolith, PostgreSQL (Prisma), WebSockets (Socket.IO)
│   └── ota-mock/   # Fastify Agoda OTA Sandbox Mock Server (port 4001)
├── packages/
│   ├── database/   # Prisma ORM, PostgreSQL with btree_gist EXCLUDE constraint & seeders
│   └── shared-types/ # Shared TypeScript DTOs, Enums, and Channel payloads
└── docker/
    └── docker-compose.yml # PostgreSQL 16 with btree_gist extension
```

---

## ✨ Key Features

1. **Bilingual Front Office & Express Reservation**:
   - Indonesian & English locale support.
   - 1-click Express Reservation with 7-day and 14-day zero-scroll view.
   - Interactive date picker supporting future reservations (2027 and beyond).
   - Real-time synchronization between Tape Chart (`/bookings`) and Front Office (`/front-office`).
2. **Indonesian Hospitality Tax Engine**:
   - Configurable PBJT Jasa Perhotelan Surakarta (10%) and 10% Service Charge (UU No. 1/2022 HKPD).
3. **Double-Booking Exclusion Safety**:
   - PostgreSQL `btree_gist` `EXCLUDE` constraint preventing overlapping physical room reservations at the database level.
4. **Agoda OTA Channel Manager**:
   - Channel adapter architecture with bi-directional sync and unassigned room queue.
   - Active OTA Mock Server on port 4001.
5. **Midtrans Payment Gateway**:
   - Automated QRIS and Virtual Account (BCA/Mandiri/BRI) payment generation with SHA-512 webhook signature verification.
6. **Guest CRM & Deduplication**:
   - Guest profile merge tool and lifetime stay ledger.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x
- PostgreSQL 16 (with `btree_gist` extension)

### Installation
```bash
# Install dependencies
pnpm install

# Run database migrations and seed Hotel Winotosastro data
pnpm --filter @hospitality/database prisma migrate deploy
pnpm --filter @hospitality/database prisma db seed

# Run test suite (47 unit & integration tests)
pnpm --filter @hospitality/api test

# Start development servers
pnpm dev
```

---

## 🌐 Netlify Deployment

For deploying the Next.js web application (`apps/web`) to Netlify:
- **Base directory**: `.`
- **Build command**: `pnpm --filter @hospitality/web build`
- **Publish directory**: `apps/web/.next`

---

## 📄 License
Private & Confidential — Hotel Winotosastro AProject.
