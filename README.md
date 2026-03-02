# tesladata.io

Live Tesla CPO resale price tracker. Updated daily automatically.

## Setup

```bash
npm install
npm run dev
```

## Trigger first scrape

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Connect at vercel.com
3. Add env vars: `CRON_SECRET`, `DEFAULT_ZIP`
4. Deploy — Vercel runs scrape automatically every day at 8am

## Data

Stored as JSON files in `/data/` — no database needed.
- `data/index.json` — summary of all snapshots
- `data/snapshots/YYYY-MM-DD.json` — full listings per day
