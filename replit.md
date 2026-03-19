# ShopClose - Daily Sales Tracker

## Overview
A daily closing tracker for shop owners. Helps record opening/closing data (cash balance, sales split by cash/UPI/card, expenses, customer visits, electricity reading, stock notes) and send closing statements to WhatsApp. Includes a dashboard with daily/weekly/monthly metrics.

## Authentication
- Session-based auth with bcrypt password hashing
- Two roles: **admin** (full access) and **user** (daily closing only)
- Default admin account: `admin` / `admin123`
- New registered users get "user" role by default
- Admin access: Dashboard, Daily Closing, Settings
- User access: Daily Closing only

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui with wouter routing
- **Backend**: Express.js REST API with express-session
- **Database**: PostgreSQL with Drizzle ORM
- **State**: TanStack Query for server state
- **Auth**: bcryptjs for password hashing, express-session + memorystore

## Pages
- `/login` - Login/Register page (shown when unauthenticated)
- `/` - Dashboard with date-range filtered charts and metrics (admin only)
- `/closing` - Daily closing form with tabs (Opening, Closing, Custom fields)
- `/settings` - Shop name, WhatsApp link, custom field management (admin only)

## Key Files
- `shared/schema.ts` - Database schema (users, shopSettings, dailyClosings)
- `server/routes.ts` - API endpoints with auth middleware
- `server/storage.ts` - Database storage layer
- `server/seed.ts` - Seed data (admin user + 7 days of sample closings)
- `client/src/hooks/use-auth.ts` - Auth hook for frontend
- `client/src/pages/login.tsx` - Login/Register page
- `client/src/pages/dashboard.tsx` - Metrics dashboard
- `client/src/pages/daily-closing.tsx` - Daily closing form
- `client/src/pages/settings.tsx` - Settings with custom fields

## API Endpoints
### Auth
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/register` - Register new user (gets "user" role)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Get current logged-in user

### Data (all require auth)
- `GET /api/settings` - Get shop settings (auth required)
- `PUT /api/settings` - Update shop settings (admin only)
- `GET /api/closings?from=&to=` - Get closings in date range
- `GET /api/closings/:date` - Get single closing by date
- `POST /api/closings` - Create new closing
- `PUT /api/closings/:id` - Update existing closing
