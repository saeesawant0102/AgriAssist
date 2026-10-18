# AgriAssist — Smart Agriculture and Crop Advisory System

AgriAssist is a local-first agricultural management platform designed to help farmers plan, monitor, and manage farming activities from a single unified web application. It integrates real-time and forecast weather data with crop lifecycle models to generate rule-based crop advisories and weather-aware irrigation schedules, alongside farm-level expense, income, and profitability tracking.

---

## 1. System Architecture & Tech Stack

- **Frontend:** React 18 (JSX), Tailwind CSS, Vite, React Router v6, React Hook Form, Zod, TanStack Query, Axios.
- **Backend:** Node.js (LTS), Express (ES modules, `"type": "module"`), Helmet, restricted CORS, Zod validation, layered architecture (Routes → Middleware → Controllers → Services → Repositories).
- **Database:** Local SQLite accessed via the asynchronous `sqlite3` npm driver (handwritten SQL, transactional plain SQL migrations, WAL mode, foreign keys enabled). Zero ORM.
- **Authentication:** Firebase Authentication (Email/Password only). Client SDK in frontend, Firebase Admin SDK in backend for token verification with revocation checks (`checkRevoked: true`). No user passwords or credentials are ever stored locally.
- **Weather Services:** Open-Meteo Forecast and Geocoding APIs (free, no API key required), cached with a 30-minute TTL and stale-data resilience.
- **Testing:** Vitest, React Testing Library, Supertest, MSW, Firebase Auth Emulator, autocannon (load testing).

---

## 2. Prerequisites

1. **Node.js**: Node.js LTS (v18.x or v20.x recommended) and `npm` (v9+).
2. **Firebase Account**: A free Firebase project for user authentication.
3. **Operating System**: Windows, macOS, or Linux.

---

## 3. Environment & Firebase Setup

### 3.1 Firebase Project Configuration
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g. `agriassist-demo`).
2. Navigate to **Authentication** > **Sign-in method**, and enable the **Email/Password** provider (leave Email link disabled).
3. Under **Project Settings** > **General**, register a Web App (`</>`) and copy the Firebase configuration keys.
4. Under **Project Settings** > **Service accounts**, click **Generate new private key**.
5. Save the downloaded JSON file to `backend/secrets/service-account.json`. *(This directory and file pattern are git-ignored).*

### 3.2 Backend Environment Configuration
Create `backend/.env` from the provided template:
```bash
cp backend/.env.example backend/.env
```
Ensure the variables are set correctly:
```env
PORT=4000
DATABASE_PATH=./data/agriassist.db
GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id
ALLOWED_ORIGINS=http://localhost:5173

OPEN_METEO_BASE_URL=https://api.open-meteo.com
OPEN_METEO_GEOCODING_URL=https://geocoding-api.open-meteo.com
WEATHER_TIMEOUT_MS=5000
WEATHER_CACHE_TTL_MINUTES=30
FORECAST_DAYS=7

IRRIGATION_REFRESH_CRON=0 */6 * * *
BACKUP_CRON=0 2 * * *
BACKUP_DIR=./data/backups
BACKUP_RETAIN_COUNT=7
```

### 3.3 Frontend Environment Configuration
Create `frontend/.env` from the provided template:
```bash
cp frontend/.env.example frontend/.env
```
Fill in your Firebase web app keys:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_USE_EMULATORS=false
VITE_API_BASE_URL=/api/v1
VITE_CURRENCY_CODE=INR
VITE_AREA_UNIT=hectares
```

---

## 4. Installation & Initial Setup

Install root, backend, and frontend dependencies:
```bash
# Install root orchestration dependencies
npm install

# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

### 4.1 Database Migrations
Migrations run **automatically** on server startup. SQLite tables and indexes are created idempotently and transactionally from `backend/src/db/migrations/`:
- `001_users.sql` (Users, Farmers, Administrators)
- `002_farms.sql` (Farms, triggers for `farm_count`)
- `003_crops.sql` (Crops)
- `004_weather_advisory.sql` (Weather data, Advisories, Links)
- `005_irrigation.sql` (Irrigation schedules, Dates, Weather links)
- `006_finance.sql` (Financial records, Expenses, Incomes, Profitability)

### 4.2 Seed Initial Administrator Account
Administrators cannot register through the public UI. Seed the initial administrator via CLI:
```bash
npm --prefix backend run seed:admin -- admin@agriassist.local "AdminSecurePass!1" "System Admin" "system_admin"
```
*(This script creates the account in Firebase Auth and seeds the local Administrator records in SQLite).*

---

## 5. Running the Application

### 5.1 Concurrent Development Server (Recommended)
Start both the Express backend (`localhost:4000`) and the Vite React frontend (`localhost:5173`) with one command:
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:5173`**.

### 5.2 Running Separately
- **Backend:** `npm --prefix backend run dev` (runs with `node --watch`)
- **Frontend:** `npm --prefix frontend run dev` (Vite dev server)

---

## 6. Testing & Quality Verification

AgriAssist maintains a comprehensive automated test suite across all layers.

### 6.1 Complete Test Suite (Zero Dependencies)
Run unit and integration tests across the entire application:
```bash
# Root convenience script (runs backend and frontend suites):
npm test

# Backend test suite (180+ tests):
npm --prefix backend test

# Frontend component & RTL test suite:
npm --prefix frontend test
```

### 6.2 Code Quality & Linting
Run ESLint across both frontend and backend packages:
```bash
npm run lint
```

### 6.3 Performance & Load Testing (PE-1, PE-2, PE-3, PE-4)
Execute the non-functional verification load test with 100 concurrent connections:
```bash
npm --prefix backend run loadtest
```
Validates that:
- p99 latency remains $< 3000$ ms across authenticated endpoints.
- Zero requests result in unhandled errors or non-2xx status codes.

### 6.4 Firebase Auth Emulator Tests (Optional)
To test `FirebaseAuthGateway` against the local Firebase emulator:
```bash
firebase emulators:exec --only auth "npm --prefix backend run test:auth-emulator"
```

---

## 7. Database Backup & Recovery

See [`docs/backup-restore.md`](docs/backup-restore.md) for full operational documentation.

### Automated Backups
- Runs according to `BACKUP_CRON` (default: `0 2 * * *` — 02:00 AM UTC).
- Uses non-blocking SQLite `VACUUM INTO` snapshots.
- Automatically keeps the newest `BACKUP_RETAIN_COUNT` (default: 7) files.

### Manual Backup
```bash
npm --prefix backend run db:backup
```

### Database Restore
> [!IMPORTANT]
> The backend server process MUST be stopped before executing a database restore.
```bash
# 1. Stop backend server (Ctrl+C)
# 2. Run restore command:
npm --prefix backend run db:restore -- ./data/backups/agriassist_<timestamp>.db
# 3. Restart server
npm run dev
```

---

## 8. Known Limitations & Design Constraints

1. **Background Scheduler Lifetime:** The `node-cron` scheduled jobs (irrigation schedule refreshes and daily backups) run within the Node.js process. Scheduled tasks fire only while the backend server process is actively running.
2. **Local Single-Instance Database:** SQLite is intended for local demonstration and single-server deployment. Multi-instance horizontal scaling with shared SQLite is not supported.
3. **External Dependencies:** Firebase Authentication and Open-Meteo weather APIs require internet connectivity for live operational use. Automated test suites use `FakeAuthGateway` and `FakeWeatherService` for fully offline testing.

---

## 9. Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| `Firebase: Error (auth/invalid-api-key)` | Frontend `.env` missing valid Firebase keys | Check `frontend/.env` values against Firebase Console Project Settings. |
| `Cannot find module service-account.json` | Missing Firebase Admin key | Place the generated service account JSON at `backend/secrets/service-account.json`. |
| `database is locked` / `busy_timeout` | Concurrency lock or unclosed connection | AgriAssist uses serialized `db.transaction()` with `WAL` mode and 5000ms `busy_timeout`. Ensure custom scripts do not open unclosed DB handles. |
| Port `4000` or `5173` already in use | Another process is listening on the port | Kill the conflicting process or modify `PORT` in `backend/.env` / `vite.config.js`. |
| Restore fails with `EBUSY` | Server process is still active | Terminate all active backend instances before running `npm run db:restore`. |
