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

## Railway deployment

Railway works well with this app as a standard Node.js service plus a managed PostgreSQL database.

Production deploy notes:

- `DATABASE_URL` comes from the Railway Postgres plugin
- `SESSION_SECRET` should be set as a long random value
- leave `APP_BASE_PATH` unset for a normal Railway root deployment
- if you still want to serve the app under a subpath behind a reverse proxy, set `APP_BASE_PATH` at runtime
- do not run `npm run db:push` during the build step
- do not add a pre-deploy command for `npm run db:push` unless the app service already has a non-empty `DATABASE_URL`

### Deploy steps

1. Push this repo to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add a PostgreSQL database plugin.
4. Set environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL` from the Railway Postgres plugin
   - `SESSION_SECRET` as a long random value
5. Use build command:
   ```bash
   npm install && npm run build
   ```
6. Use start command:
   ```bash
   npm start
   ```
7. If your database is empty and you need schema creation, run `npm run db:push` after the Railway database is provisioned, not during build.
8. Copy the Railway service URL and test the app there.

## Database migration

If you change the schema and want to update the Railway database, run:

```bash
npm run db:push
```

Only run this after `DATABASE_URL` is set and the Railway PostgreSQL plugin is attached.

## Railway troubleshooting

If Railway shows `DATABASE_URL, ensure the database is provisioned` during a pre-deploy step, it usually means the app service is trying to run `db:push` before the database reference has been populated.

Fix:

1. Remove `npm run db:push` from the Railway build or pre-deploy command.
2. Attach the PostgreSQL plugin to the Railway project.
3. Confirm the app service `DATABASE_URL` variable is non-empty in Railway.
4. Deploy the app.
5. Run `npm run db:push` only after the database is provisioned and linked.
