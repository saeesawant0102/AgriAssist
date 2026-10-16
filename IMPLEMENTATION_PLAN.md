# AgriAssist — Master Implementation Plan

> **Authoritative Specification:** [`AgriAssist.md`](file:///c:/Users/Sakshi/AgriAssist/AgriAssist.md) and [`master.md`](file:///c:/Users/Sakshi/AgriAssist/master.md).  
> **Target Environment:** Local machine only (Windows / Node.js LTS).  
> **Core Stack:** React 18 (JavaScript / JSX) + Tailwind CSS + Express.js (ES modules) + SQLite (`sqlite3` package with handwritten SQL) + Firebase Authentication (Auth only) + Open-Meteo APIs (Forecast & Geocoding).  
> **Constraint:** Pure JavaScript only (no TypeScript), async SQLite with serialized transactions, zero ORM, and strict phase-by-phase execution with passing test gates.

---

## 1. Project Overview & Architecture Summary

### 1.1 System Layers
1. **Frontend (`frontend/`)**: React 18 SPA created with Vite, styled with Tailwind CSS, using React Router v6, Axios with `/api/v1` base (proxied via Vite to port 4000), TanStack Query for data fetching, React Hook Form + Zod for form validation, and Firebase Client SDK (Email/Password Auth).
2. **Backend (`backend/`)**: Standalone Express server (port 4000) using plain JavaScript ES modules (`"type": "module"`), `node --watch` development, helmet, restricted CORS, Zod request validation, and clean layered architecture:
   $$\text{Routes} \longrightarrow \text{Middleware} \longrightarrow \text{Controllers} \longrightarrow \text{Services / Domain Models} \longrightarrow \text{Repositories} \longrightarrow \text{SQLite}$$
3. **Database Layer (`backend/src/db/`)**: Local SQLite database (`backend/data/agriassist.db`), accessed via the async `sqlite3` driver wrapped in a Promise-based `Database` class with mutex-serialized transactions (`BEGIN IMMEDIATE`), enforced pragmas (`foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 5000`), and versioned plain SQL migrations.
4. **External Services**:
   - **Firebase Authentication**: For user credentials, password hashing, and token issuance/revocation. Server validates ID tokens with `checkRevoked = true` via `firebase-admin`. No passwords stored locally.
   - **Open-Meteo**: For weather forecasts and geocoding coordinates (free, no API key). Injected behind the `WeatherService` contract with 30-minute local caching and stale-fallback resilience.

---

## 2. Non-Negotiable Rules & Standards

1. **JavaScript Only**: All files are `.js` or `.jsx`. No TypeScript, no `.ts`/`.tsx`, no `tsconfig.json`. JSDoc comments used for type descriptions.
2. **Database Isolation**: The browser never talks directly to SQLite. Only files in `backend/src/repositories/` execute SQL queries. All SQL statements must be parameterized.
3. **Async SQLite Semantics**: Every repository function takes an executor (`db` or `tx`) as its first argument and returns a Promise. Inside `db.transaction(async (tx) => ...)`, only `tx` is called to prevent deadlocks.
4. **Domain Concept Fidelity**: Class names, property names, database columns, and API JSON keys strictly follow snake_case as specified in `AgriAssist.md`. Methods follow camelCase equivalents. IDs are integers.
5. **Traceability**: Every implementing function must include its SRS requirement ID (e.g., `Farm.Add`, `Irrigation.Skip`, `SE-5`) in a code comment. Every test must prefix its title with the requirement ID.
6. **Zero Secrets in Git**: No `.env`, service-account JSON, or SQLite `.db` files committed. Only `.env.example` files are tracked.
7. **No Out-of-Scope Bloat**: No social logins, payments, push/SMS notifications, IoT, ML models, charts, mobile apps, or Firestore.
8. **Phase Gate Enforcement**: Each phase is built and verified as a complete vertical slice. Subsequent phases only start after all unit, integration, and contract tests pass and explicit approval is granted. Commits follow the format `phase-N: <title>`.

---

## 3. Detailed Phase Breakdown & Milestones

### Phase 0: Foundation and Tooling
- **Status:** COMPLETED (Verified with 33 passing automated tests, clean linting, and verified proxy)
- **Focus:** Full-stack skeleton, database access layer, migration engine, layout shell, test infrastructure.
- **Backend Scope:**
  - Initialize `package.json` (ES modules, dependencies: `express`, `sqlite3`, `helmet`, `cors`, `zod`, `dotenv`, `firebase-admin`, `node-cron`).
  - Configure `backend/src/config/env.js` with Zod schema validation.
  - Implement `backend/src/errors/AppError.js` and `errorHandler.js` mapping errors to standard JSON structure `{ error: { code, message, details } }`.
  - Implement `backend/src/db/connection.js`: Promise-based `Database` class with mutex lock for `transaction()`, `run`, `get`, `all`, `exec`, `backupTo`, and `close`. On open execute PRAGMAs: `foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000`.
  - Implement `backend/src/db/migrate.js`: Transactional, idempotent runner creating/updating `schema_migrations`.
  - Implement utility modules: `clock.js` (Clock contract + system clock), `round.js`, `dates.js`, `pagination.js`.
  - Implement `backend/src/app.js` (`createApp(deps)` without cron jobs) and `backend/src/server.js` (wires container, runs migrations, listens on port 4000, starts cron).
  - Implement health check route `GET /api/v1/health` returning `200 { "status": "ok" }`.
  - Setup test helpers in `backend/test/helpers/`: `createTestApp()` (in-memory SQLite), `FakeAuthGateway`, `FakeWeatherService`, `fixedClock`.
- **Frontend Scope:**
  - Initialize React 18 + Vite + Tailwind CSS application in `frontend/`.
  - Configure `vite.config.js` with dev proxy `/api` $\rightarrow$ `http://localhost:4000`.
  - Build UI primitives in `frontend/src/components/ui/`: `Button`, `Input`, `Select`, `Modal`, `ConfirmDialog`, `Toast`, `Spinner`, `EmptyState`, `Card`, `Table`, `Badge`.
  - Build layout in `frontend/src/components/layout/`: `AppLayout`, `Sidebar`, `Topbar`.
  - Implement `frontend/src/services/apiClient.js` with Axios interceptors attaching Bearer tokens and mapping Section 12.1 error responses to `ApiError`.
  - Setup placeholder `ProtectedRoute.jsx` and router skeleton.
  - Firebase SDK initialization in `frontend/src/config/firebase.js` with `VITE_USE_EMULATORS` switch.
- **Root & Tooling:**
  - Root `package.json` with convenience script `npm run dev` running backend and frontend concurrently.
  - ESLint, Prettier, Vitest setup for backend and frontend.
  - `firebase.json` for Auth Emulator on port 9099.
  - `.gitignore` for node_modules, `.env*`, `backend/secrets`, SQLite `.db` and backups.
- **Verification & Exit Criteria:**
  - `GET /api/v1/health` returns `200 { "status": "ok" }` directly and via Vite proxy.
  - Migration runner verifies `PRAGMA foreign_keys = 1` and is idempotent.
  - `transaction()` correctly commits, rolls back on error, and serializes concurrent calls without deadlock.
  - `createApp` proven not to start cron jobs.
  - Frontend smoke test renders `AppLayout`.
  - Commit: `phase-0: Foundation and tooling`.

---

### Phase 1: Authentication and Profile Management (Feature 1)
- **Status:** COMPLETED (Verified with 60 passing automated tests, clean linting, and role enforcement)
- **Requirements:** `Auth.Register`, `Auth.Login`, `Auth.Logout`, `Auth.Profile.View`, `Auth.Profile.Update`, `SE-1`, `SE-2`, `SE-3`, `CO-4`, Forgot/Change Password.
- **Backend Scope:**
  - Migration `001_users.sql`: `users`, `farmers`, `administrators` with case-insensitive unique email, `firebase_uid`, `user_type`, `status`. No local passwords.
  - `AuthGateway.js` contract and `FirebaseAuthGateway.js` implementation (`verifyIdToken` with `checkRevoked=true`, `createUser`, `deleteUser`, `setDisabled`, `revokeRefreshTokens`).
  - Domain models: `User` (abstract), `Farmer`, `Administrator`. `toJSON()` hides `password` and `firebase_uid`.
  - Repository `userRepository.js`, services `authService.js` and `profileService.js`.
  - Middleware: `authenticate.js` (verifies token, checks status $\neq$ 'disabled', injects user) and `authorize.js` (checks `users.user_type`).
  - Endpoints:
    - `POST /api/v1/auth/register` (public, registers farmer; compensating Firebase user deletion if SQLite write fails; duplicate email $\rightarrow$ 409).
    - `POST /api/v1/auth/login` (verifies Firebase token, loads profile; disabled $\rightarrow$ 403).
    - `POST /api/v1/auth/logout` (revokes refresh tokens).
    - `GET /api/v1/auth/profile` & `PUT /api/v1/auth/profile` (name, phone, address update only; email immutable).
  - Admin seed script: `backend/scripts/seedAdmin.js <email> <password> <name> <role>`.
- **Frontend Scope:**
  - `AuthContext.jsx` handling Firebase Auth state, server profile sync, and sign out.
  - Pages: `Login`, `Register`, `ForgotPassword` (neutral message on reset request), `Profile`, `ChangePassword` (re-authenticate + `updatePassword`).
  - `ProtectedRoute` enforcing authentication and role-based route access.
- **Verification & Exit Criteria:**
  - Supertest integration tests for all auth routes, compensation on failure, and role checks.
  - Auth Emulator tests for `FirebaseAuthGateway`.
  - Frontend RTL/MSW tests for auth forms, redirects, and profile updates.
  - Playwright E2E: Register $\rightarrow$ Logout $\rightarrow$ Login $\rightarrow$ Update Profile $\rightarrow$ Change Password $\rightarrow$ Logout.
  - Commit: `phase-1: Authentication and profile management`.

---

### Phase 2: Farm Management (Feature 2)
- **Status:** Completed
- **Requirements:** `Farm.Add`, `Farm.View`, `Farm.Edit`, `Farm.Delete`, `Farm.Validate`, `BR-1`, `BR-2`, `SE-5`, `D5`, `D6`, `D21`.
- **Backend Scope:**
  - Migration `002_farms.sql`: `farms` table with `farm_id`, `farmer_id` FK cascade, coordinates, and DB triggers (`trg_farms_after_insert`, `trg_farms_after_delete`) automatically updating `farmers.farm_count`.
  - `Farm.js` domain class, `farmRepository.js`, `farmService.js` enforcing ownership (`crop $\rightarrow$ farm $\rightarrow$ farmer $\rightarrow$ user`).
  - `backend/src/weather/geocoding.js`: Open-Meteo geocoding with 5-second timeout.
  - Endpoints:
    - `POST /api/v1/farms` (farmer gets own `farmer_id`; admin provides valid `farmer_id`; geocodes location if coords omitted; 400 if unknown, 502 if upstream down).
    - `GET /api/v1/farms` & `GET /api/v1/farms/:farmId` (farmer sees own; admin sees all or filtered).
    - `PUT /api/v1/farms/:farmId` (farmer only; admin $\rightarrow$ 403).
    - `DELETE /api/v1/farms/:farmId` (farmer or admin; triggers cascade).
- **Frontend Scope:**
  - Pages & Components: `FarmList`, `FarmForm` (create/edit with manual coordinate fallback), `FarmDetails`, `ConfirmDialog` for deletes.
  - Display area with `VITE_AREA_UNIT`. Admin view allows adding on behalf of farmer and deleting, without edit controls.
- **Verification & Exit Criteria:**
  - Triggers maintain `farm_count` accurately on insert, delete, and farmer cascade delete.
  - Geocoding mocked via MSW; validation and manual coordinate bypass verified.
  - Ownership checks: foreign farmer edit/delete returns 403.
  - Playwright E2E: Add $\rightarrow$ Edit $\rightarrow$ View $\rightarrow$ Delete farm.
  - Commit: `phase-2: Farm management`.

---

### Phase 3: Crop Management (Feature 3)
- **Status:** Queued
- **Requirements:** `Crop.Add`, `Crop.View`, `Crop.Edit`, `Crop.Delete`, `Crop.Stage.Update`, `BR-3`, `SE-5`.
- **Backend Scope:**
  - Migration `003_crops.sql`: `crops` table with `farm_id` FK cascade, sowing/harvest dates, `CHECK (harvest_date IS NULL OR harvest_date >= sowing_date)`.
  - `Crop.js` domain model, `cropRepository.js`, `cropService.js` (ownership verified through farm $\rightarrow$ farmer; `farm_id` strictly immutable).
  - Growth stages constant: `['Sowing', 'Germination', 'Vegetative', 'Flowering', 'Fruiting', 'Maturity', 'Harvested']`.
  - Endpoints:
    - `POST /api/v1/farms/:farmId/crops` (farmer only).
    - `GET /api/v1/farms/:farmId/crops` & `GET /api/v1/crops/:cropId`.
    - `PUT /api/v1/crops/:cropId` (`farm_id` omitted/ignored).
    - `PATCH /api/v1/crops/:cropId/stage` (validates against 7 allowed stages).
    - `DELETE /api/v1/crops/:cropId` (cascades child records).
    - Admin has read-only access; admin mutation attempts return 403.
- **Frontend Scope:**
  - Crops section inside `FarmDetails`, `CropForm`, `GrowthStageSelect`, `CropDetails`, crop deletion dialog.
- **Verification & Exit Criteria:**
  - Crop creation on own farm; rejection on foreign farm.
  - Validation: `harvest_date < sowing_date` rejected by Zod and SQLite CHECK.
  - Stage update accepts only valid 7 stages. Admin write attempts return 403.
  - Playwright E2E: Add crop $\rightarrow$ Update stage $\rightarrow$ Delete.
  - Commit: `phase-3: Crop management`.

---

### Phase 4: Weather Dashboard, Crop Advisory and Alerts (Feature 4)
- **Status:** Queued
- **Requirements:** `Weather.Fetch`, `Weather.Display`, `Advisory.Generate`, `Advisory.Display`, `BR-4`, `PE-3`, `DE-1`, `OE-5`, `SI-2`, Weather Alert Notification.
- **Backend Scope:**
  - Migration `004_weather_advisory.sql`: `weather_data` (append-only), `crop_advisories`, `advisory_weather` junction.
  - `WeatherService.js` contract, `WeatherAPI.js` implementation (Open-Meteo forecast API, 5-second timeout, 7 forecast days fetched).
  - WMO weather code mapping in `weatherCodes.js`.
  - Daily forecast humidity calculated as the mean of 24 hourly values (1 decimal); forecast temp as mean of max/min (1 decimal).
  - `weatherRepository.js`: 30-minute caching by `(farm_id, type)` using newest `fetched_at`; stale cache fallback on upstream outage with `stale: true`; 502 if no cache exists.
  - `advisoryRules.js`: 7 priority rules (Harvest before rain, Heavy rain, Heat stress, Cold/frost, Strong wind, Fungal risk, Dry spell, Default). Headline comes from first triggered rule; message joins all triggered messages.
  - `alertRules.js`: on-demand evaluation of next 3 days (`HIGH_WIND` $\ge 50$, `HEAVY_RAIN` $\ge 50$, `EXTREME_HEAT` $\ge 42$, `FROST` $\le 2$, `THUNDERSTORM` $\ge 95$).
  - Endpoints:
    - `GET /api/v1/farms/:farmId/weather/current`
    - `GET /api/v1/farms/:farmId/weather/forecast?days=5|6|7`
    - `GET /api/v1/farms/:farmId/weather/alerts`
    - `POST /api/v1/crops/:cropId/advisories` (Sequence Diagram 1 implementation)
    - `GET /api/v1/crops/:cropId/advisories` & `GET /api/v1/crops/:cropId/advisories/latest`
- **Frontend Scope:**
  - `WeatherDashboard` with farm selector, `CurrentWeatherCard`, `ForecastList` (5/6/7 day selector), `AlertBanner`, stale-cache warning, Open-Meteo attribution.
  - `CropAdvisory` page with "Get Crop Advisory" action, recommendation card, and history.
- **Verification & Exit Criteria:**
  - Open-Meteo mapping unit tests using static fixtures (`fixtures/open-meteo-forecast.json`).
  - Unit tests for all 7 advisory rules and 5 alert rules (at, below, and above thresholds).
  - Cache TTL hit/miss and stale fallback tests with `fixedClock`.
  - Cascade tests: deleting farm/crop deletes weather and advisory links.
  - Playwright E2E with local mock Open-Meteo server.
  - Commit: `phase-4: Weather dashboard, crop advisory and alerts`.

---

### Phase 5: Irrigation Scheduling (Feature 5)
- **Status:** Queued
- **Requirements:** `Irrigation.Generate`, `Irrigation.View`, `Irrigation.Update`, `Irrigation.Skip`, `BR-5`, `DE-1`.
- **Backend Scope:**
  - Migration `005_irrigation.sql`: `irrigation_schedules`, `irrigation_schedule_dates`, `schedule_weather`.
  - `cropRequirements.json` containing only `{ "default": { "interval_days": 5, "water_mm": 25 } }`.
  - `irrigationRules.js`: generates candidate dates over 7-day horizon; rainy day if precip prob $\ge 60\%$ or rainfall $\ge 5\text{ mm}$; sets `is_skipped=1` and `skip_recommended=1` with descriptive note.
  - In-place refresh transaction: updates schedule row, replaces dates and weather links atomically.
  - Scheduled job `refreshIrrigationSchedules.js` run every 6 hours (`IRRIGATION_REFRESH_CRON`), registered in `server.js` only; batches by farm.
  - Endpoints:
    - `POST /api/v1/crops/:cropId/irrigation-schedules`
    - `GET /api/v1/crops/:cropId/irrigation-schedules`
    - `POST /api/v1/irrigation-schedules/:scheduleId/refresh`
- **Frontend Scope:**
  - `IrrigationScheduling` page: select farm & crop $\rightarrow$ view forecast $\rightarrow$ generate $\rightarrow$ display `ScheduleCard` (frequency, water requirement, dates) and `SkipNotice` when skipped dates exist $\rightarrow$ refresh action $\rightarrow$ schedule history.
- **Verification & Exit Criteria:**
  - Schedule generation on dry vs rainy forecast; fallback to default crop requirement.
  - Schedule refresh updates same row and replaces child rows.
  - Cron job function refreshes active schedules and batches requests by farm.
  - Playwright E2E: Generate schedule $\rightarrow$ view skip notice $\rightarrow$ refresh.
  - Commit: `phase-5: Irrigation scheduling`.

---

### Phase 6: Expense, Income, Profitability and Export (Feature 6)
- **Status:** Queued
- **Requirements:** `Expense.Add`, `Income.Add`, `Expense.View`, `Profit.Calculate`, `Profit.Report`, `BR-6`, Export Report.
- **Backend Scope:**
  - Migration `006_finance.sql`: `financial_records` (type: 'Expense' | 'Income', amount $> 0$), child tables `expenses` and `incomes`, `profitability` with partial unique index `idx_profit_overall` on `(farm_id) WHERE is_overall = 1`.
  - Domain models: `FinancialRecord` (abstract), `Expense`, `Income`, `Profitability`.
  - Repositories: `financialRepository.js`, `profitabilityRepository.js`.
  - `financialService.js`: `addExpense` and `addIncome` delegate to `addRecord` exactly once, inserting parent and child rows in one transaction; `type` is immutable.
  - `profitabilityService.js`: automatically recomputes and upserts all-time overall profitability row (`is_overall = 1`) in the same transaction as every financial record write. Date-range calculation inserts a new row (`is_overall = 0`). Net profit = total income $-$ total expense (negative indicates loss).
  - Endpoints:
    - `POST /api/v1/farms/:farmId/expenses` & `POST /api/v1/farms/:farmId/incomes`
    - `GET /api/v1/farms/:farmId/financial-records` (filters: `type`, `from`, `to`)
    - `PUT /api/v1/financial-records/:recordId` & `DELETE /api/v1/financial-records/:recordId`
    - `GET /api/v1/farms/:farmId/financial-summary` (live aggregation)
    - `POST /api/v1/farms/:farmId/profitability/calculate` (date range)
    - `GET /api/v1/farms/:farmId/profitability`
    - `GET /api/v1/farms/:farmId/reports/financial` (JSON payload for client export)
- **Frontend Scope:**
  - `Finance` page: farm selector, add expense/income forms, `RecordTable` with filters, summary cards.
  - `Profitability` page: date-range calculation, history list, distinct styling for negative net profit (loss).
  - Client-side export: CSV using native browser Blob and PDF using `jspdf` + `jspdf-autotable`. Currency formatted with `VITE_CURRENCY_CODE`.
- **Verification & Exit Criteria:**
  - Parent and child financial records atomically created; `amount <= 0` rejected.
  - Profit calculation math verified for profit, loss, zero, and inclusive date bounds.
  - Upsert of overall profitability maintains single row per farm.
  - CSV and PDF export generator unit tests (headers, row counts, totals).
  - Playwright E2E: Sequence Diagram 2 flow (Expense $\rightarrow$ Income $\rightarrow$ Calculate Profit $\rightarrow$ Export CSV).
  - Commit: `phase-6: Expense, income and profitability`.

---

### Phase 7: Dashboards, Reports and Administration
- **Status:** Queued
- **Requirements:** `Farmer.view_dashboard`, `Farmer.view_reports`, `Administrator.manage_users`, `Administrator.manage_system`, `Administrator.view_all_reports`, Manage Farmer Accounts, `OR-9`.
- **Backend Scope:**
  - `dashboardService.js`:
    - `GET /api/v1/dashboard` (farmer dashboard: farm count, crop count, latest advisory, next irrigation date, overall net profit).
    - `GET /api/v1/reports/profitability` (farmer reports: overall profitability across owned farms).
  - `adminService.js`:
    - `GET /api/v1/admin/stats` (system counts: farmers, farms, crops, financial records).
    - `GET /api/v1/admin/reports` (profitability across all farms and farmers).
    - `GET /api/v1/admin/users` (keyset pagination by integer ID: `limit`, `cursor`, `status`).
    - `GET /api/v1/admin/users/:userId` & `PUT /api/v1/admin/users/:userId` (name, phone, address).
    - `PATCH /api/v1/admin/users/:userId/status` (`active` | `disabled`; updates Firebase user, revokes tokens, updates SQLite).
    - `DELETE /api/v1/admin/users/:userId` (deletes Firebase user then deletes `users` row, cascading local data; retry-safe).
  - Enforce that admin operations target only accounts where `user_type = 'farmer'`. Admins cannot modify or delete admin accounts or themselves.
- **Frontend Scope:**
  - `FarmerDashboard.jsx` and farmer `Reports.jsx`.
  - Admin pages: `AdminDashboard.jsx`, `FarmerAccounts.jsx` (keyset pagination & status filters), `FarmerAccountDetails.jsx` (edit profile, enable/disable, delete), `AdminFarms.jsx` (view all, add on behalf of farmer, delete), `AllReports.jsx`.
  - Role-specific sidebar: admins do not see crop/farm edit controls or financial recording inputs.
- **Verification & Exit Criteria:**
  - Admin endpoints strictly deny farmers with 403.
  - Farmer account disable immediately prevents subsequent logins; re-enabling restores access.
  - Keyset pagination and cursor handling verified.
  - Playwright E2E: Admin disables farmer $\rightarrow$ farmer login fails $\rightarrow$ admin re-enables $\rightarrow$ login succeeds.
  - Commit: `phase-7: Dashboards, reports and administration`.

---

### Phase 8: Hardening, Non-Functional Verification and Local Packaging
- **Status:** Queued
- **Focus:** Backup/restore, performance, security review, documentation, full regression.
- **Scope & Deliverables:**
  - Automated backups: `jobs/dailyBackup.js` registered in `scheduler.js` (`BACKUP_CRON`, default 02:00 daily), keeping newest `BACKUP_RETAIN_COUNT` (7).
  - CLI scripts: `backend/scripts/backupDb.js` and `backend/scripts/restoreDb.js` using `Database.backupTo()` (`VACUUM INTO`) and validating `PRAGMA integrity_check`.
  - Documentation:
    - `docs/backup-restore.md`: step-by-step backup and restore instructions.
    - `docs/api-examples.http`: REST client file covering all main endpoints and token usage.
    - Comprehensive `README.md`: prerequisites, setup, migration details, admin seed, test execution, troubleshooting.
  - Non-functional verification:
    - PE-1: `autocannon` load test with 100 concurrent connections against authenticated read endpoints using seeded file DB.
    - PE-2 to PE-4: response times verification ($\le 3\text{s}$ dashboard, $\le 5\text{s}$ weather with 5s timeout, $\le 2\text{s}$ core mutations).
    - Responsive layout audit (mobile, tablet, desktop) and accessibility checks.
  - Security audit: parameterized SQL checks, CORS, helmet, no secrets committed, no passwords in DB/logs, `firebase_uid` stripped in responses.
  - Full end-to-end regression pass matching Section 18 final acceptance checklist.
  - Commit: `phase-8: Hardening and local packaging`.

---

## 4. Execution Workflow & Traceability Protocol

To prevent any deviation or defect during implementation:
1. **Approval Required**: No code or files for Phase 0 or beyond will be created until this implementation plan is formally approved by the user.
2. **Phase Isolation**: Work will be conducted strictly within the active phase. No forward-leaping or partial future phase code will be introduced.
3. **Traceability Tagging**:
   - Backend functions: `// Requirement: <SRS_ID>`
   - Test suites: `it('<SRS_ID>: <description>', ...)`
4. **End-of-Phase Report**: At the end of each phase, a structured report will be delivered containing:
   - Implemented scope and requirement IDs.
   - List of added/changed files.
   - Exact test commands run with full pass/fail output.
   - Confirmation of zero secrets/database files in git.
   - Phase commit hash and message.
