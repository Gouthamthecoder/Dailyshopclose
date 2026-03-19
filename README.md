# Daily Sales Reporter

This project is a local-friendly version of the Replit app. If `DATABASE_URL` is not set, the server now starts with in-memory storage so you can develop and test the UI without PostgreSQL.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Run locally

```bash
npm install
npm run dev
```

The app starts on [http://localhost:5000](http://localhost:5000).

To run it under a subpath such as `/Dailyshopclose`:

```bash
APP_BASE_PATH=/Dailyshopclose npm run dev
```

## Default login

- Username: `admin`
- Password: `admin123`

## Notes

- In-memory mode is for local development only. Data resets whenever the server restarts.
- To use PostgreSQL instead, set `DATABASE_URL` before running the app.
- To use a custom session secret, set `SESSION_SECRET`. If omitted, a development-only fallback secret is used.
- To deploy under a path like `https://mylitlmonkeys.com/Dailyshopclose`, set `APP_BASE_PATH=/Dailyshopclose` at build and runtime, and put the app behind a reverse proxy that forwards `/Dailyshopclose` and `/Dailyshopclose/api`.
# Dailyshopclose
