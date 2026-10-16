# AgriAssist --- Master Implementation Prompts

## How to use this file

This file contains **nine independent, copy-ready prompts**, one for
each implementation phase (0--8) defined in `AgriAssist.md`.

1.  Give the AI coding agent the complete `AgriAssist.md` file and the
    prompt for the phase assigned to you.
2.  Work only on that phase. Do not start later phases.
3.  The agent must inspect the existing repository before editing
    anything. If another teammate has already completed work, preserve
    and extend it rather than replacing it.
4.  At the end, require a test report, a list of changed files, exact
    run commands, and the phase commit `phase-N: <title>`.
5.  If a required decision is genuinely absent from `AgriAssist.md`,
    stop and ask the owner instead of inventing behaviour.

------------------------------------------------------------------------

# Shared project context --- included in every prompt

**Project:** AgriAssist, a local-only Smart Agriculture and Crop
Advisory System for college demonstration and development. Farmers
manage farms and crops, view current weather and a 5--7-day forecast,
receive rule-based crop advisories and irrigation schedules, record
expenses/income, calculate profitability, and export financial reports.
Administrators manage farmer accounts, add/delete farms on behalf of
farmers, view system statistics, and view all profitability reports.

**Authoritative specification:** `AgriAssist.md` is the source of truth.
Read it fully before implementation, especially Sections 0--5
(authority, decisions, deviations, reconciliations, defaults), 6--14
(stack, architecture, classes, schema, workflows, APIs, business rules,
security), 15 (phase plan), 16 (testing), 17 (traceability), 18
(acceptance), and 19 (environment/scripts). Section 2 owner decisions
and Sections 3--5 override conflicting source diagrams/SRS. Do not
silently reinterpret requirements. If a required item is ambiguous and
not resolved in the spec, stop and ask the owner.

**Fixed stack and runtime** - Frontend: React 18 (JavaScript/JSX) + Vite + Tailwind CSS, React Router v6, React Hook Form + Zod, Axios, TanStack
Query. - Auth: Firebase Authentication, email/password only. Firebase
client SDK in React; Firebase Admin SDK in Express. - Backend: Node.js LTS + Express, JavaScript ES modules; `node --watch` for development, no build step. -
Database: local SQLite through the async `sqlite3` npm package (never `better-sqlite3`), handwritten SQL only, plain SQL migrations; **no ORM**. - Weather: Open-Meteo forecast and
geocoding APIs; no API key. - Tests: Vitest, React Testing Library,
Supertest, MSW, Firebase Auth Emulator, Playwright. ESLint, Prettier. **JavaScript only, no TypeScript.** - Local only: Vite on `localhost:5173`, Express
on `localhost:4000`, SQLite at `backend/data/agriassist.db`. No cloud
deployment. Firebase Auth and Open-Meteo remain external services and
require internet for normal use.

**Non-negotiable architecture and conventions** 1. Browser talks to
Express for application data and to Firebase Auth for authentication.
Browser never connects directly to SQLite. React calls `/api/v1` through
the Vite proxy. 2. Backend layering: routes → middleware → controllers →
services/domain models → repositories → SQLite. **Only
`backend/src/repositories/` executes SQL.** Controllers parse/validate
and shape responses; business logic belongs in services/domain classes.
3. `createApp(deps)` injects `db`, `authGateway`, `weatherService`, and
`clock`; it must not start cron jobs. `server.js` creates real
dependencies, runs migrations, listens, and starts scheduled jobs. 4.
Use `AuthGateway` and `WeatherService` contracts (JSDoc-documented base classes); services must not
directly depend on Firebase Admin or the concrete Open-Meteo class. 5.
All SQL is parameterized. Use the async `db.transaction(async (tx) => ...)` helper (`AgriAssist.md` Section 7.4) for every multi-statement write. Database pragmas: `foreign_keys=ON`,
`journal_mode=WAL`, `busy_timeout=5000`. 6. JSON fields and database
columns use the exact **snake_case** names from `AgriAssist.md`; all
entity IDs are integers. JavaScript method names use camelCase equivalents of diagram operation names. Preserve domain class names. 7.
Traceability is mandatory: put the relevant SRS/requirement ID in a
comment above every implementing function and in every test name,
e.g. `it('Farm.Add: creates a farm for the logged-in farmer', ...)`. 8.
Validate bodies, params and queries with Zod before writes. Use the
documented JSON response/error shapes and HTTP status codes from Section
12. Do not leak stack traces. 9. Every protected endpoint verifies
Firebase ID tokens with revocation checking, looks up `users` by
`firebase_uid`, rejects missing profiles and disabled accounts, and
derives roles from `users.user_type`. Enforce ownership in services on
every farmer-facing resource. A farmer can access only their own
records. 10. Never store passwords in SQLite or logs. Never commit
`.env`, Firebase service-account keys, secrets, or SQLite
database/backup files. Keep `.env.example` files. 11. Do not add
features not in the spec: no social login, payments, push/SMS/email
notifications (except Firebase password-reset email), IoT, ML models,
charts, mobile apps, Firestore, ORM, or deployment infrastructure. 12.
Keep UI responsive and accessible, with clear labels, validation,
loading/error/empty states, confirmations for destructive actions, and
toast feedback. Match the specified feature scope; do not invent visual
functionality. 13. Every phase is a vertical slice and must include
tests. Do not proceed to the next phase until all current and previous
tests pass. Commit once per phase using exactly `phase-N: <title>`. 14.
Tests must not call real Firebase or real Open-Meteo. Use
`FakeAuthGateway`, `FakeWeatherService`, MSW, fixtures, Firebase Auth
Emulator, and the local Open-Meteo mock as appropriate. The separate
live Open-Meteo contract test is manually run only. 15. Use the exact
API contracts in Section 12, schema/migrations in Section 9, and rule
algorithms/thresholds in Section 13. Do not invent crop-specific
agronomy values: `cropRequirements.json` must contain only the specified
`default` entry until the owner supplies more values. 16. **JavaScript only.** All code is plain JavaScript (`.js` backend, `.js`/`.jsx` frontend, ES modules). No TypeScript, no `.ts`/`.tsx` files, no `tsconfig.json`, no type-check steps; use JSDoc where helpful. 17. **Async SQLite.** The `sqlite3` driver is asynchronous: use only the Promise-based `Database` class from `AgriAssist.md` Section 7.4; every repository function returns a Promise and takes an executor (`db` or `tx`) as its first argument; inside a transaction callback use only `tx`.

**Expected repository shape:** root `AgriAssist.md`, README, root
scripts; `backend/` for Express/JavaScript, migrations, models,
repositories, services, routes, jobs and tests; `frontend/` for React/JavaScript/Tailwind, feature modules, components and tests. Use
Section 11 for the detailed tree. Respect existing work and avoid
unnecessary rewrites.

**Required end-of-phase report** - Summary of implemented scope and
requirement IDs. - Changed/added files. - Commands run and pass/fail
result for lint, unit, integration, and relevant
E2E/auth-emulator tests. - Any tests not run and why; never claim unrun
tests passed. - Manual verification steps and exact local run
commands. - Confirmation of security, traceability,
no-secrets/no-database-in-git checks. - Confirm exit criteria below are
met before committing. If not met, fix the failures rather than marking
the phase complete.

------------------------------------------------------------------------

# Prompt --- Phase 0: Foundation and Tooling

You are implementing **Phase 0 --- Foundation and Tooling** for
AgriAssist. Read the entire Shared Project Context above and the
complete `AgriAssist.md` specification. Phase 0 must create an empty but
runnable full-stack skeleton, not application feature behaviour.

## Scope

1.  Inspect the repository, current branch, package managers, installed
    dependencies, and existing files before making changes. Preserve
    useful existing work. Create the folder structure in Section 11
    without generating all future feature code prematurely.
2.  Backend:
    -   Set up JavaScript (ES modules) + Express and scripts (`dev`, `start`, `lint`, `test`; no build step).
    -   Implement `src/server.js`, `src/app.js`, `src/container.js`,
        `config/env.js`, `errors/AppError.js`, health route, versioned
        router mounted at `/api/v1`, centralized error handler.
    -   `createApp(deps)` must receive injected dependencies and must
        not start cron jobs.
    -   Add `helmet`, JSON body-size limit (about 100 KB), CORS
        restricted to `ALLOWED_ORIGINS`, safe error responses, and
        environment validation with Zod.
    -   Add `db/connection.js`: the Promise-based `Database` class wrapping `sqlite3` (`run`, `get`, `all`, `exec`, `transaction`, `backupTo`, `close`; mutex-serialised transactions per `AgriAssist.md` Section 7.4) with `foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000`.
    -   Add migration runner with `schema_migrations`; apply SQL files
        in filename order, each migration transactionally and
        idempotently. No feature table migration in this phase.
    -   Add `Clock` contract/system clock, `round.js`, `dates.js`, and
        `pagination.js`.
    -   Add test helpers: async `createTestApp()` using `:memory:` SQLite,
        `FakeAuthGateway`, `FakeWeatherService`, and `fixedClock`.
3.  Firebase/test configuration:
    -   Document setup for Firebase email/password provider and
        service-account file in `backend/secrets/` (git-ignored).
    -   Add `firebase.json` for **Auth Emulator only** on port 9099,
        using a `demo-` project ID in emulator test instructions. Do not
        introduce Firestore.
    -   Do not require real Firebase credentials for ordinary
        unit/integration tests.
4.  Frontend:
    -   Set up React 18 + Vite (JavaScript/JSX) + Tailwind, router skeleton,
        `AppLayout`, responsive Sidebar/Topbar and reusable UI
        primitives specified in Section 11.
    -   Implement API client with base `/api/v1`, optional Firebase
        ID-token attachment, `ApiError` mapping of Section 12.1 error bodies,
        and Vite proxy `/api` → `http://localhost:4000`.
    -   Initialize Firebase client SDK with `VITE_USE_EMULATORS` switch.
    -   Add placeholder `ProtectedRoute`; no complete auth flow yet.
5.  Root scripts must make `npm run dev` start frontend and backend
    together. Add ESLint, Prettier, Vitest; MSW setup
    where needed. Optional CI workflow is allowed but do not let it
    distract from required local setup.
6.  Add `.gitignore` rules for `node_modules`, all `.env*` except
    `.env.example`, `backend/secrets`, SQLite DBs and backups, build
    output, test artifacts.

## Tests and acceptance

-   `GET /api/v1/health` returns `200 { "status": "ok" }` through direct
    backend and Vite proxy.
-   Migration runner applies available migrations in order, records
    versions, and is idempotent.
- Verify `PRAGMA foreign_keys` returns `1`.
-   Verify `transaction()` commits, rolls back on error, and serialises concurrent transactions.
-   Verify `createApp` does not start cron jobs.
-   Frontend smoke test renders `AppLayout`.
-   API client maps the standard error format correctly.
-   Run lint and all Phase 0 tests.
-   Confirm `npm run dev` starts the backend on port 4000 and frontend
    on 5173.

## Exit gate

Do not implement authentication, farms, crops, weather features, finance
or admin workflows yet. Phase 0 is complete only when the skeleton runs
locally and all tests pass. Commit as `phase-0: Foundation and tooling`.

------------------------------------------------------------------------

# Prompt --- Phase 1: Authentication and Profile Management

Implement **Phase 1 --- Authentication and Profile Management**. Read
the entire Shared Project Context and complete `AgriAssist.md`,
especially Sections 8, 9.3, 12.1--12.2, 14--16 and the Phase 1 plan.
Build on the existing Phase 0 foundation; do not replace it.

## Required behaviour

-   Firebase email/password registration, login, logout, password reset
    and password change.
-   Local SQLite profile records, Farmer/Administrator distinction,
    profile view/update.
-   Administrators are created only by the seed script; public
    registration always creates a farmer.

## Backend

1.  Create migration `001_users.sql` exactly as Section 9.3: `users`,
    `farmers`, `administrators`, unique case-insensitive email,
    `firebase_uid`, `user_type`, `status`, timestamps, indexes. Never
    store a password.
2.  Implement `AuthGateway` and `FirebaseAuthGateway` with
    `verifyIdToken`, `createUser`, `deleteUser`, `setDisabled`,
    `revokeRefreshTokens`. Translate duplicate-email errors to typed
    application errors; deleting an already-missing Firebase user is a
    no-op.
3.  Implement `User` abstract class, `Farmer`, `Administrator`,
    `userRepository`, `authService`, `profileService`, and
    auth/authorization middleware. `toJSON()` must never expose
    `password` or `firebase_uid`.
4.  Implement routes and validators from Section 12.2:
    -   `POST /auth/register`: validate; create Firebase user;
        transactionally insert `users` and `farmers`; if SQL fails,
        compensate by deleting the Firebase user; duplicate email →
        `409`.
    -   `POST /auth/login`: client has already signed in with Firebase;
        verify token, load profile, reject missing/disabled accounts.
    -   `POST /auth/logout`: revoke refresh tokens; client then calls
        Firebase `signOut()`.
    -   `GET /auth/profile`; `PUT /auth/profile` allows only name,
        phone, address (email changes are forbidden).
5.  Implement `scripts/seedAdmin.js` with CLI args
    `<email> <password> <name> <role>`, creating the Firebase user and
    matching SQL rows. No HTTP admin-creation endpoint.
6.  Use `checkRevoked=true`; return the exact documented response/error
    format and status codes.

## Frontend

-   Implement `AuthContext` around Firebase `onAuthStateChanged`; after
    client sign-in, call `POST /auth/login` to load the server profile.
-   Pages: Login, Register, Forgot Password (`sendPasswordResetEmail`
    with a neutral confirmation message), Profile, Change Password
    (reauthenticate using current password then `updatePassword`).
-   `ProtectedRoute` redirects unauthenticated users to `/login`;
    role-based navigation/sidebar; Zod validation and accessible inline
    errors/toasts.
-   Disabled users must be signed out and shown a clear, safe error
    message.

## Tests

-   Backend integration with Supertest, in-memory SQLite, and
    `FakeAuthGateway`: registration success and no password stored;
    duplicate email 409; invalid input 400; Firebase compensation on SQL
    failure; login success, missing/revoked token 401, disabled user
    403, missing profile 403; logout revokes; profile view/update; email
    cannot be changed; wrong-role denial.
-   Auth Emulator tests for create, verify, revoke, disable and delete.
-   Unit tests for model serialization and validators.
-   Frontend RTL/MSW tests for validation, login redirect, guard
    redirect and profile update.
-   Playwright flow: register → logout → login → update profile → change
    password → logout.
-   Never call the real Firebase project from automated tests.

## Exit gate

Farmer can register/login/logout/update profile/reset/change password;
admin can be seeded and log in; all phase and previous tests pass.
Commit as `phase-1: Authentication and profile management`.

------------------------------------------------------------------------

# Prompt --- Phase 2: Farm Management

Implement **Phase 2 --- Farm Management** only. Read the Shared Project
Context and `AgriAssist.md`, especially Sections 4 (R1), 5 (D5/D6/D21),
8, 9.4, 12.3, 14--16 and Phase 2. Preserve Phase 0--1 behaviour.

## Backend

1.  Add migration `002_farms.sql` exactly as Section 9.4: integer
    autoincrement `farm_id`, `farmer_id` FK with cascade, `farm_name`,
    `location`, positive `area`, required `latitude`/`longitude`,
    timestamps, index, and insert/delete triggers maintaining
    `farmers.farm_count`. Never manually maintain the count in service
    code.
2.  Implement `Farm` domain class, `farmRepository`, `farmService`; all
    SQL stays in the repository and is parameterized. Validate with Zod
    before writes.
3.  Implement `weather/geocoding.js` using Open-Meteo Geocoding API,
    5-second timeout, injected/testable URL and MSW mocks. On
    create/edit, geocode `location` unless explicit latitude and
    longitude are supplied. Unknown location → `400 LOCATION_NOT_FOUND`;
    upstream failure → `502 WEATHER_UNAVAILABLE`.
4.  Implement Section 12.3 routes and exact role behaviour:
    -   `POST /farms`: farmer's `farmer_id` is derived from caller and
        body values ignored; admin must provide a valid `farmer_id` to
        add on behalf of a farmer.
    -   `GET /farms` and `GET /farms/:farmId`: farmer sees own records;
        admin can read all, optionally filter by `farmer_id`.
    -   `PUT /farms/:farmId`: farmer only; admin receives `403`.
    -   `DELETE /farms/:farmId`: farmer owner or admin; cascade handled
        by SQLite.
5.  Enforce ownership in the service layer. If an ID does not exist
    return 404; if it exists but belongs to another farmer return 403,
    per the spec.

## Frontend

-   Implement `FarmList`, `FarmForm` for create/edit, `FarmDetails`, and
    delete confirmation via `ConfirmDialog`.
-   Show farm name, location, area with unit from `VITE_AREA_UNIT`, and
    useful validation/loading/empty/error states.
-   Permit optional manual latitude/longitude; explain location lookup
    errors clearly.
-   Admin UI can list farms, add a farm for a selected farmer, view
    details, and delete; never show admin edit capability.

## Tests

-   Add farm with mocked geocoding stores coordinates and changes
    farm_count from 0 to 1.
-   Validation and `area <= 0` rejected (including database CHECK).
-   Farmer lists only own farms; cross-owner access denied.
-   Edit and delete; count decrements on delete.
-   Trigger correctness for farmer cascade deletion.
-   Unknown geocoding result gives 400; upstream error gives 502; manual
    coordinates skip geocoding.
-   Admin add-on-behalf for valid farmer, admin delete, admin edit →
    403.
-   Frontend form, list/empty state and confirmation tests.
-   E2E: add → edit → view → delete farm.
-   Requirement IDs in implementing comments and test names.

## Exit gate

Farm CRUD works end-to-end with ownership and role enforcement; all
earlier tests pass. Commit as `phase-2: Farm management`.

------------------------------------------------------------------------

# Prompt --- Phase 3: Crop Management

Implement **Phase 3 --- Crop Management** only. Read the Shared Project
Context and `AgriAssist.md`, especially Sections 5 (D3/D5), 8, 9.5,
12.4, 14--16 and Phase 3. Preserve all earlier phases.

## Backend

1.  Add `003_crops.sql` exactly as Section 9.5: `crops` table with
    integer key, `farm_id` FK/cascade, crop name, variety,
    sowing/harvest dates, growth stage default `Sowing`, timestamps,
    index, and CHECK that harvest date is null or on/after sowing date.
2.  Implement `Crop` class, `cropRepository`, `cropService`, validators
    and routes from Section 12.4. Repositories only execute
    parameterized SQL.
3.  Ownership is verified through crop → farm → farmer → user. `farm_id`
    is immutable after creation: never accept it in update payload or
    include it in SQL `UPDATE`.
4.  `growth_stage` must be one of exactly: `Sowing`, `Germination`,
    `Vegetative`, `Flowering`, `Fruiting`, `Maturity`, `Harvested`,
    defined centrally in `config/constants.js`.
5.  Admin can read crops but cannot add/edit/delete/update stage.

## Frontend

-   Add crops section inside farm details; implement `CropForm`,
    `GrowthStageSelect`, `CropDetails`, crop edit and delete
    confirmation.
-   Require crop name and sowing date; variety/harvest date optional;
    display and update growth stage.
-   Use consistent loading, empty, validation and error states.

## Tests

-   Create crop on own farm; reject foreign farm.
-   Invalid dates and `harvest_date < sowing_date` → 400 and DB CHECK
    verified.
-   List crops by farm; read crop; edit without allowing `farm_id`
    change.
-   Stage accepts only the seven configured values.
-   Delete crop cascades dependent records when those tables exist.
-   Admin read allowed; admin mutations return 403.
-   Frontend form and stage-update tests; E2E add crop → update stage →
    delete.
-   Test names/comments include requirement IDs.

## Exit gate

Crop CRUD and growth-stage update work end-to-end, with correct
authorization and cascade behaviour. All prior tests pass. Commit as
`phase-3: Crop management`.

------------------------------------------------------------------------

# Prompt --- Phase 4: Weather Dashboard, Crop Advisory and Alerts

Implement **Phase 4** only. Read the Shared Project Context and
`AgriAssist.md`, especially Sections 4 (R3/R4/R7), 5 (D12/D14/D16/D17),
8, 9.6, 12.5--12.6, 13.1--13.2 and 13.5, 14--16. Preserve prior phases.
Do not use ML; advisories are rule-based.

## Backend

1.  Add migration `004_weather_advisory.sql` exactly as Section 9.6:
    `weather_data`, `crop_advisories`, `advisory_weather`, required
    fields, foreign keys/cascades and indexes. Weather rows are
    append-only; each fetch batch shares one `fetched_at` and inserts
    one current row plus seven forecast rows.
2.  Implement the `WeatherService` contract (base class) and concrete `WeatherAPI` for
    Open-Meteo forecast/geocoding integration, `WeatherData`, WMO code
    mapping, `weatherRepository`, `weatherDashboardService`,
    `alertService`, `CropAdvisory`, `advisoryRepository`,
    `advisoryService`.
3.  Fetch current and daily forecast fields listed in Section 13.1.
    Forecast humidity is the mean of the day's 24 hourly humidity values
    (one decimal); forecast temperature is mean of max/min (one
    decimal). Map WMO codes exactly as specified. Always fetch seven
    days and slice response to requested 5/6/7 days. Timeout = 5000 ms.
4.  Cache by farm and type for 30 minutes. Reuse fresh cache. On
    upstream failure return older cached data with `stale: true`; if no
    cache exists return `502 WEATHER_UNAVAILABLE`. Never mutate old
    weather rows.
5.  Implement endpoints from Sections 12.5--12.6: current weather,
    forecast (`days` only 5, 6, or 7), alerts, generate advisory,
    advisory history and latest advisory. Enforce ownership; admins may
    read weather/advisories but cannot generate advisories.
6.  Advisory rule engine must implement all priority rules and exact
    thresholds/messages in Section 13.2: harvest-before-rain, heavy
    rain, heat stress, cold/frost, strong wind, fungal risk, dry spell,
    default. Headline comes from first triggered rule; message
    concatenates all triggered messages in priority order. Persist
    advisory and link current weather plus the next five forecast rows.
7.  Alert rules in Section 13.5: next three days, `HIGH_WIND` ≥50 km/h,
    `HEAVY_RAIN` ≥50 mm, `EXTREME_HEAT` ≥42°C, `FROST` ≤2°C,
    `THUNDERSTORM` weather code ≥95. Alerts are computed on demand, not
    stored.
8.  Keep weather access behind injected `WeatherService`; tests use
    `FakeWeatherService` or MSW fixtures, never live Open-Meteo.

## Frontend

-   `WeatherDashboard`: farm selector, current card with
    temperature/humidity/rainfall probability/wind/conditions,
    selectable 5/6/7-day forecast, severe alert banner, stale-cache
    notice.
-   `CropAdvisory`: farm/crop selectors, Get Advisory action,
    recommendation/message and history.
-   Show Open-Meteo attribution in footer. Include loading, empty and
    failure states.

## Tests

-   Fixture-based mapping, hourly humidity mean, rounding and WMO code
    coverage.
-   Every advisory rule tested below/at/above threshold, rule priority,
    combined messages and default advisory.
-   Every alert threshold.
-   API happy path, validation, auth/role/ownership.
-   Cache hit avoids second call; expiry refetches using fixed clock;
    stale fallback and no-cache 502.
-   Advisory and weather association persistence; cascade after
    crop/farm deletion.
-   Frontend weather fields, selector, alerts, stale/error state and
    advisory flow.
-   E2E add farm → add crop → weather → advisory against local mock
    server.
-   Requirement IDs in test names and code comments.

## Exit gate

Current weather, 5--7 day forecast, alerts and crop advisories work
end-to-end; all rule thresholds and BR-4 are honoured. All earlier tests
pass. Commit as `phase-4: Weather dashboard, crop advisory and alerts`.

------------------------------------------------------------------------

# Prompt --- Phase 5: Irrigation Scheduling

Implement **Phase 5 --- Irrigation Scheduling** only. Read the Shared
Project Context and `AgriAssist.md`, especially Sections 5 (D15/D18), 8,
9.7, 12.7, 13.3, 14--16. Preserve all previous phases. Do not invent
crop-specific agronomy values.

## Backend

1.  Add `005_irrigation.sql` exactly as Section 9.7:
    `irrigation_schedules`, `irrigation_schedule_dates`,
    `schedule_weather`, keys, constraints, cascades and indexes.
2.  Implement `IrrigationSchedule`, `irrigationRepository`,
    `irrigationService`, `irrigationRules.js`, and
    `cropRequirements.json`. The JSON must contain only the specified
    placeholder: `{ "default": { "interval_days": 5, "water_mm": 25 } }`
    (represent it with valid JSON); do not create per-crop entries
    without owner/domain-expert data.
3.  Generate a schedule from the crop and its farm using seven-day
    forecast D\[0\]..D\[6\]. `start_date=D[0]`, `end_date=D[6]`;
    candidate dates are D\[0\] plus interval multiples while inside
    horizon. Rainy means probability ≥60% OR rainfall ≥5 mm. Mark each
    candidate date skipped/non-skipped, set `skip_recommended` if any
    candidate is skipped, create the exact note described in Section
    13.3, and set `frequency`/`water_required` strings exactly.
4.  Persist weather associations. Refresh updates the same schedule row,
    replaces child dates/weather links in a single transaction, and
    updates `updated_at`.
5.  Implement the refresh job as a plain testable function. Register
    cron only in `server.js` through scheduler; run every six hours
    using `IRRIGATION_REFRESH_CRON`. Refresh non-expired schedules and
    group by farm so weather is fetched once per farm. Cron jobs must
    not start in `createApp`.
6.  Routes must match Section 12.7. Enforce ownership. Return
    `irrigation_dates` and `skipped_dates`, each sorted ascending.

## Frontend

-   Implement `IrrigationScheduling`: select farm and crop; show
    forecast before generation; generate schedule; show dates, frequency
    and water requirement; clear skip notice; refresh existing schedule;
    list history.
-   Include loading/error/empty states and confirmation only where
    destructive actions exist.

## Tests

-   Dry forecast schedules all candidate dates; rainy forecast marks
    dates skipped and gives note.
-   Unknown crop name uses only the default config.
-   Refresh updates same schedule row and replaces child rows when
    forecast changes.
-   Job refreshes only active/non-expired schedules and fetches weather
    once per farm.
-   Cron expression validates; route ownership, order and crop-delete
    cascade tested.
-   Frontend skip notice, empty state and generate/view/refresh.
-   E2E generate → view → refresh with mock weather.
-   Requirement IDs in code comments/test names.

## Exit gate

Schedules can be generated, viewed and refreshed manually and by job;
rain correctly triggers skip recommendations; all previous tests pass.
Commit as `phase-5: Irrigation scheduling`.

------------------------------------------------------------------------

# Prompt --- Phase 6: Expense, Income, Profitability and Export

Implement **Phase 6** only. Read the Shared Project Context and
`AgriAssist.md`, especially Sections 4 (R6/R10), 8, 9.8, 12.8, 13.4,
14--16. Preserve all earlier phases.

## Backend

1.  Add `006_finance.sql` exactly as Section 9.8: `financial_records`,
    `expenses`, `incomes`, `profitability`, constraints, indexes and
    partial unique overall-profit index.
2.  Implement `FinancialRecord`, `Expense`, `Income`, `Profitability`,
    `financialRepository`, `profitabilityRepository`,
    `financialService`, `profitabilityService`, `reportService`.
3.  `addExpense` delegates to
    `FinancialRecord.addRecord(type='Expense')` exactly once and inserts
    one `expenses` child row in the same DB transaction. `addIncome`
    similarly inserts one income child row. Never create duplicate
    parent records. Record `type` is immutable.
4.  Add/update/delete financial record and recompute the all-time
    overall profitability row (`is_overall=1`, null dates) in the same
    transaction; upsert exactly one row per farm. Date-range calculation
    inserts a new row (`is_overall=0`).
    `net_profit=total_income-total_expense`, rounded to two decimals;
    negative is a loss. Date bounds inclusive; start must not be after
    end.
5.  Implement endpoints exactly as Section 12.8, including financial
    records filters, summary, calculate profit, saved profitability
    history and JSON financial report dataset.
6.  All records belong to a farm, ownership must be verified. Use INR by
    default and date format `YYYY-MM-DD`.

## Frontend

-   Finance page: farm selector, expense/income forms, record table,
    type/date filters, summary cards.
-   Profitability page: date-range calculation, saved results/history,
    clear negative-profit/loss display.
-   Export buttons: create CSV using native Blob and PDF with `jspdf` +
    `jspdf-autotable` from the report JSON endpoint. Currency is
    configured by `VITE_CURRENCY_CODE`.
-   Ensure exports contain farm, period, records, totals and generated
    timestamp; accessible controls and helpful error/loading states.

## Tests

-   Each expense/income creates exactly one parent plus one matching
    child row.
-   Amount ≤0 and invalid dates rejected.
-   Summary/profit math for profit, loss, empty records, inclusive date
    bounds and rounding.
-   Overall profitability remains one row after add/update/delete; range
    calculations append a row.
-   Start date after end → 400; type immutable; ownership and role
    checks.
-   Report endpoint dataset, CSV headers/row count/totals and PDF
    generator tests.
-   Cascade on farm deletion; frontend forms/tables/summary/loss/export
    tests.
-   E2E: add expense → add income → calculate profit → export CSV.
-   Requirement IDs in comments/test names.

## Exit gate

Sequence Diagram 2 works end-to-end and profit equals income minus
expenses. All earlier tests pass. Commit as
`phase-6: Expense, income and profitability`.

------------------------------------------------------------------------

# Prompt --- Phase 7: Dashboards, Reports and Administration

Implement **Phase 7** only. Read the Shared Project Context and
`AgriAssist.md`, especially Sections 5 (D6--D11), 8, 12.9--12.10, 14--18
and Phase 7. Preserve all previous phases. No new migration is planned.

## Backend

1.  Implement `dashboardService` and endpoints:
    -   `GET /dashboard`: farm count, crop count, latest advisory, next
        irrigation date, overall net profit.
    -   `GET /reports/profitability`: overall profitability for each
        farmer-owned farm.
2.  Implement `adminService` and all Section 12.10 endpoints for:
    -   `manageSystem`: counts of farmers, farms, crops and financial
        records.
    -   Manage farmer accounts: list, view, update profile
        (name/phone/address only), enable/disable, delete; keyset
        pagination by integer ID (`limit` default 20, max 100, cursor =
        last ID).
    -   Admin farms: view all, add on behalf of valid farmer, delete; no
        edit.
    -   View all profitability reports, read-only.
3.  Role comes from `users.user_type`; only farmer accounts are
    manageable. Admin cannot update/delete admin accounts or themselves.
4.  Disabling a farmer updates local status, disables Firebase Auth and
    revokes refresh tokens; disabled account must be rejected by
    middleware. Enabling restores login.
5.  Deleting a farmer must delete the Firebase user and dependent local
    data in the exact safe order specified in Section 12.10. Handle
    partial failure so retry after simulated mid-way failure succeeds;
    database cascades must do data deletion, not manual cascade loops.
6.  Every admin endpoint is protected and farmer access returns 403.
    Apply keyset pagination, filters, validation and exact response
    format from Section 12.

## Frontend

-   Complete FarmerDashboard and farmer Reports pages.
-   Admin pages: AdminDashboard, FarmerAccounts with status filter and
    pagination, FarmerAccountDetails with profile
    editing/enable-disable/delete confirmation, AdminFarms, AllReports.
-   Sidebar items are role-specific. Admin has no financial-entry or
    crop/farm-edit controls.
-   Provide accessible tables, confirmation dialogs, loading/error/empty
    states and success/failure feedback.

## Tests

-   Dashboard numbers match seeded records and profitability.
-   Admin list filters, pagination and cursor behaviour.
-   Disable blocks login; enable restores it.
-   Admin cannot modify/delete admin accounts or self.
-   Farmer deletion removes Firebase user and dependent rows; simulated
    mid-way failure can be retried safely.
-   System statistics/all-report totals; every `/admin/*` endpoint
    rejects farmer with 403.
-   Frontend admin screens and role-based navigation.
-   E2E admin disables farmer → farmer login blocked → admin re-enables.
-   Requirement IDs in code comments and test names.

## Exit gate

Every use-case-diagram item and class-diagram operation is reachable
through UI/API with correct permissions; all prior tests pass. Commit as
`phase-7: Dashboards, reports and administration`.

------------------------------------------------------------------------

# Prompt --- Phase 8: Hardening, Non-Functional Verification and Local Packaging

Implement **Phase 8 --- Hardening, Non-Functional Verification and Local
Packaging** only. Read the Shared Project Context and complete
`AgriAssist.md`, especially Sections 14--19. Preserve working
implementation; avoid gratuitous rewrites or feature changes.

## Tasks

1.  Backups and restore:
    -   Implement `jobs/dailyBackup.js`, register it in scheduler using
        `BACKUP_CRON` (default daily at 02:00), keep newest
        `BACKUP_RETAIN_COUNT` (default 7), and ensure jobs are started
        only by `server.js`.
    -   Implement `scripts/backupDb.js` and `scripts/restoreDb.js`;
        restore requires server stopped. Use `VACUUM INTO` via `Database.backupTo()` (Section 7.4) and validate the restored DB can open, pass `PRAGMA integrity_check` and query.
    -   Write `docs/backup-restore.md`, including safe local
        instructions and failure cases.
2.  Non-functional verification:
    -   PE-1: load test with `autocannon`, 100 concurrent connections
        against authenticated read endpoints using seeded file DB and
        fake auth.
    -   PE-2: dashboard/list endpoints ≤3 seconds locally.
    -   PE-3: weather timeout ≤5000 ms, weather endpoints ≤5 seconds.
    -   PE-4: farm/crop/expense/schedule requests ≤2 seconds excluding
        live geocoding dependency.
    -   Check responsive layout on mobile/tablet/desktop; keyboard
        navigation, focus visibility, labels, validation and helper
        text; verify in Chromium, Firefox and WebKit where supported.
3.  Security review:
    -   Audit every resource endpoint for authentication, role and
        cross-owner access.
    -   Verify SQL has no string-concatenated user values; dynamic
        identifiers/order clauses use allow-lists.
    -   Verify `helmet`, restricted CORS, body limit, safe error
        handling and Zod validation.
    -   Verify passwords never enter SQLite/logs and `firebase_uid` is
        never returned to clients.
    -   Verify secrets, `.env` files and SQLite/backup files are ignored
        by Git.
4.  Documentation/local packaging:
    -   Complete README with Node LTS prerequisite, Firebase project
        setup, enabling email/password provider, service-account path,
        frontend/backend environment setup, migration behaviour, admin
        seeding, `npm run dev`, all test commands, backup/restore, known
        limitation that cron jobs run only while backend process runs,
        and troubleshooting.
    -   Add `docs/api-examples.http` for representative endpoints and
        token usage.
    -   Ensure `.env.example` files contain all documented variables but
        no secrets.
5.  Run the complete regression suite: lint, backend unit/integration, Auth Emulator tests, frontend tests, E2E, and load
    test where environment supports it. Never claim tests passed if they
    were not run. Fix regressions before finishing.

## Final acceptance

Run the complete Section 18 scenario from a fresh clone following only
README: 1. Seed admin; register farmer; logout/login; request password
reset and change password. 2. Add geocoded farm; add crop; update stage.
3. Show current weather and 5/7-day forecasts; alerts at thresholds. 4.
Generate and persist crop advisory. 5. Generate irrigation schedule;
rainy forecast recommends skip; refresh updates it; job function
refreshes too. 6. Add expense/income; verify summary/profit; calculate
date-range profit; export CSV/PDF. 7. Verify farmer dashboard and
reports. 8. Admin stats, manage farmer, disable/re-enable, add/delete
farm for farmer, view all reports. 9. Verify farmer cannot access
another farmer's data through any endpoint. 10. Backup and restore work;
automated tests pass.

## Exit gate

Only finish when Section 18 acceptance passes or provide a precise list
of blockers with evidence. Commit as
`phase-8: Hardening and local packaging`.

------------------------------------------------------------------------

# Handoff checklist for teammates

Before handing work to another person: - \[ \] Commit the completed
phase with the exact required commit message. - \[ \] Update README or
phase notes only when the specification asks for it; do not change
`AgriAssist.md` decisions without owner approval. - \[ \] Include
changed files, test commands/results and known blockers in the
handoff. - \[ \] Ensure no `.env`, service-account key, SQLite DB,
backup, or personal test data was committed. - \[ \] The next teammate
pulls the latest branch and runs the prior phase's tests before
starting. - \[ \] If work is incomplete, state that clearly; do not
label the phase complete.
