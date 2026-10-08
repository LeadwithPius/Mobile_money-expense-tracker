# Mobile Money Expense Tracker

A full-stack app that turns pasted mobile money SMS messages into clean, categorized transactions and a spending dashboard.

> 🚧 **Work in progress.** The backend API works and is tested. The frontend (an installable React PWA) is planned and not started yet. See the [Roadmap](#-roadmap) for current progress.

## 📖 About

Mobile money users in East and Southern Africa often have no record of their spending beyond a long scroll of SMS confirmations. This project parses those messages into structured data so people can search, total, and understand where their money goes.

The goal is a live, installable Progressive Web App backed by an API built from scratch with Node.js and PostgreSQL.

## ✅ What works today

- M-Pesa SMS parser: sent, received, paybill, buy goods, withdrawal, and airtime messages
- Duplicate-safe import: pasting the same message twice never creates a second record
- Keyword-based categorization
- User registration and login (bcrypt + JWT)
- Per-user data isolation, rate limiting, input validation, and secure headers
- Transaction listing with filters and pagination
- Automated tests and CI

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js, Express |
| Database | PostgreSQL |
| Validation | Zod |
| Auth | JWT, bcrypt |
| Testing | Vitest, Supertest |
| CI | GitHub Actions |
| Frontend (planned) | React, Vite, Tailwind CSS, Recharts, `vite-plugin-pwa` |

## 🚀 Getting Started

**Prerequisites:** Node.js 20 or newer, and PostgreSQL (local or a free hosted instance such as Neon or Supabase).

```bash
git clone https://github.com/LeadwithPius/Mobile_money-expense-tracker.git
cd Mobile_money-expense-tracker
npm install
cp .env.example .env     # set DATABASE_URL and JWT_SECRET
npm run migrate
npm run dev              # http://localhost:3000
```

Run the tests with `npm test`.

## 📡 API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/register` | No | Create an account, returns a token |
| `POST` | `/auth/login` | No | Log in, returns a token |
| `POST` | `/transactions/import` | Yes | Parse and store pasted messages |
| `GET` | `/transactions` | Yes | List transactions (filters: `from`, `to`, `category`, `type`, `limit`, `offset`) |

Protected routes need the header `Authorization: Bearer <token>`. Amounts are stored and returned in cents (`50000` means Ksh 500.00).

## 🗺️ Roadmap

**Backend**
- [x] M-Pesa parser with tests
- [x] Authentication and per-user data isolation
- [x] Duplicate-safe import
- [x] Transaction filtering and pagination
- [x] Automated tests and CI
- [ ] Harden the parser with real anonymized messages
- [ ] Custom categorization rules and category editing
- [ ] Monthly report endpoint
- [ ] Demo mode with fake data
- [ ] CSV export
- [ ] Airtel Money and MTN MoMo parsers
- [ ] OpenAPI docs

**Frontend (PWA)**
- [ ] Project setup, login, and demo mode
- [ ] Import and transaction list screens
- [ ] Dashboard with charts
- [ ] Manifest, service worker, offline support, and install prompt

**Deployment**
- [ ] API and database hosted online
- [ ] Frontend deployed and linked from my portfolio

## 🔐 Privacy

SMS messages contain sensitive financial details. Raw message text is not stored, only the parsed fields, and it is never written to logs. Any public demo will use fake data only.

## 👤 Author

**Bruce Pius**, Computer Science student and full-stack developer

- Portfolio: [leadwithpius.netlify.app](https://leadwithpius.netlify.app/)
- GitHub: [@LeadwithPius](https://github.com/LeadwithPius)
