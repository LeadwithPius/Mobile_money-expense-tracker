# Mobile Money Expense Tracker

A local Node.js prototype that turns MTN Zambia SMS messages into categorized
transactions. It currently runs in the terminal. A web dashboard, database-backed
API, authentication, and optional AI categorization are future work.

## Implemented

- MTN payments, received money, and withdrawals, including timestamp variations.
- Monetary values stored as integer ngwee: `900` means ZMW 9.00.
- Airtime and Mobile Data rules; unclear payments stay Uncategorized.
- Duplicate checks by provider and transaction ID; missing/conflicting IDs need review.
- Local JSON storage preserving prior records and user category corrections.
- Interactive category review and expense/transfer selection.
- All-time and monthly summaries separating confirmed and suggested spending.
- Vitest parser, categorizer, deduplication and summary tests with fictional fixtures.

## Setup

Use a supported Node.js LTS version compatible with the locked dependencies.
This checkout was validated with Node.js 24.19.0.

```bash
npm ci
mkdir -p private
```

Create `private/messages.txt` locally, with one complete SMS per line. Blank lines
are ignored. Do not commit real financial messages.

```bash
npm test
npm start
npm run review
npm run summary
npm run summary -- 2026-10
```

`npm start` imports new records into `private/transactions.json`. Repeated imports
skip matching records. Missing-ID or conflicting messages are held out and reported
by source line. Their original text remains in messages.txt.

`npm run review` saves each confirmed category correction. Run imports and reviews
one at a time: the JSON store does not support concurrent writers.

`npm run summary` reads saved records without changing them. Monthly reports use
Africa/Lusaka time. Received money is not automatically income. Withdrawals are
cash transfers, not automatically spending. Unknown expense treatment stays visible.
Confirmed spending requires completed review; rule suggestions remain separate.
Amount totals exclude fees, which are reported separately, including unknown-fee
counts. These totals are not a current wallet balance and exclude held messages.

## Files

| File | Purpose |
| --- | --- |
| `src/mtn.js` | MTN extraction and validation |
| `src/categorizer.js` | Initial category suggestions |
| `src/deduplicator.js` | Duplicate/conflict checks |
| `src/storage.js` | JSON reads and atomic file replacement |
| `src/index.js` | Import command |
| `src/review.js` | Category review command |
| `src/summaryService.js` | Reusable summary calculations |
| `src/summary.js` | Summary command |
| `tests/` | Automated tests |

## Privacy and limitations

The whole `private/` folder, dependencies and `.env` are ignored. Ignoring files does
not remove previously committed copies from history. Earlier commits must be handled
separately if private data was published. Use fictional data for demos and tests.
Category review displays counterparties locally; summaries show aggregate amounts.

The parser does not authenticate SMS senders, extract fees, or support every MTN
format. Missing IDs need a future review/import workflow. There is no API,
authentication, PostgreSQL storage, M-Pesa parser, or frontend in this version.

## Next steps

1. Add a durable review workflow for missing-ID and conflicting messages.
2. Test and improve category review, including editing previously reviewed entries.
3. Build a local dashboard and import/review interface around these modules.
4. Add a database/API and user separation before supporting multiple users.
5. Add optional AI suggestions with user overrides.

## Author

Bruce Pius — [GitHub](https://github.com/LeadwithPius)