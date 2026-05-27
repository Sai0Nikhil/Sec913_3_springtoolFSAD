# SpringBoot_FSAD — Task & Role Management Platform

A full-stack task-and-role management application.

- **Backend:** Spring Boot 4.0.6 (Java 25), JPA/Hibernate on PostgreSQL, JWT auth, **BCrypt** password hashing, CSV reporting, OpenAPI/Swagger docs.
- **Frontend:** React 19 + Vite, React Router 7, jsPDF for PDF export.
- **Architecture:** Stateless REST API + SPA. The browser holds a JWT and sends it on every request via the `Token` header.

---

## Repository layout

```
SpringBoot_FSAD/
├── backend/
│   └── coreservices/          Spring Boot service (Maven, packaged as WAR)
│       ├── src/main/java/mth/
│       │   ├── CoreservicesApplication.java
│       │   ├── config/        SecurityConfig (BCrypt bean), DataInitializer, WebConfig
│       │   ├── controller/    REST endpoints (Users, Tasks, Roles, Menus, Mapping, Reports)
│       │   ├── models/        JPA entities (Users, Tasks, Roles, Menus, Rolesmapping, …)
│       │   ├── repository/    Spring Data JPA repositories
│       │   ├── services/      Business logic (UsersService, TasksService, JwtService, …)
│       │   └── util/          CsvUtil
│       ├── src/main/resources/application.properties
│       └── pom.xml
├── frontend/                  React + Vite SPA
│   ├── src/
│   │   ├── App.jsx, main.jsx
│   │   ├── components/        Home, Dashboard, MyTask, TaskManager, UserManager, RolesAdmin, …
│   │   ├── lib.js             API helper / fetch wrapper
│   │   └── exports.js         PDF/CSV export helpers
│   └── package.json
└── sample-tasks.csv           Sample CSV for bulk task import
```

---

## Security — BCrypt password hashing

All user passwords are stored as **BCrypt** hashes (cost factor 10). Plaintext passwords never touch the database.

**How it's wired:**

1. `pom.xml` pulls in `org.springframework.security:spring-security-crypto`. Only the crypto module is included — the full Spring Security filter chain stays disabled so the existing JWT-based auth keeps working unchanged.
2. `mth.config.SecurityConfig` exposes a single `PasswordEncoder` bean:
   ```java
   @Bean public PasswordEncoder passwordEncoder() {
       return new BCryptPasswordEncoder(10);
   }
   ```
3. `mth.services.UsersService` uses the encoder in three places:
   - **Sign-up** — `passwordEncoder.encode(password)` before `UR.save(U)`.
   - **Sign-in** — loads the user via `findByEmail` and calls `passwordEncoder.matches(raw, storedHash)`.
   - **Change password** — verifies the current password with `matches(...)`, then stores the new one with `encode(...)`.

**Legacy plaintext rows (e.g. the seed users in `Readme.txt`) are handled gracefully:**

- A helper `isBcryptHash(String)` checks for the `$2a$ / $2b$ / $2y$` prefix and 60-char length.
- If a stored password is not a BCrypt hash, the service falls back to a one-time plaintext equality check on sign-in. On a successful match, the row is **rehashed and saved in place**, so the next login uses BCrypt.
- The same fallback runs on change-password, so the upgrade also happens when a user changes their password.

**Migration note:** if you've already inserted users via the SQL snippet in `backend/coreservices/Readme.txt`, you don't have to truncate them. Log in once with the old plaintext password and the row will be auto-upgraded to a BCrypt hash. After that, BCrypt is the only accepted format.

The legacy JPQL query `UsersRepository.validateCredentials` is marked `@Deprecated` and is no longer called; it's kept only to avoid breaking external references.

---

## Backend functionality

### Authentication (`/authservice`)

| Method | Path                                  | Who          | What it does |
|-------:|---------------------------------------|--------------|--------------|
| POST   | `/authservice/signup`                 | Public       | Create a user account. Server-side validation for name/email/phone/password. Admin role (id 3) cannot be self-selected. Password is BCrypt-hashed. |
| POST   | `/authservice/signin`                 | Public       | Verify credentials against the BCrypt hash and return a signed JWT. |
| GET    | `/authservice/uinfo`                  | Logged in    | Return the current user's profile plus the menu list mapped to their role. |
| PATCH  | `/authservice/me`                     | Logged in    | Update own `fullname` / `phone`. |
| POST   | `/authservice/password`               | Logged in    | Change own password (verifies current, hashes new). |
| GET    | `/authservice/list`                   | Admin / Manager / can-assign users | Return every user with role name attached. |
| PATCH  | `/authservice/users/{id}/can-assign`  | Admin only   | Grant or revoke a user's permission to assign tasks. |
| GET    | `/authservice/test`                   | Public       | Health-check endpoint. |

### Tasks (`/tasks`)

| Method | Path                          | Who              | What it does |
|-------:|-------------------------------|------------------|--------------|
| POST   | `/tasks`                      | Admin            | Create a task. Supports per-user or per-role assignment, due date, scheduled work date, hours/minutes allocation. |
| POST   | `/tasks/bulk`                 | Admin            | Bulk-create tasks (e.g. from a CSV import). |
| GET    | `/tasks/all`                  | Admin / Manager  | List all tasks across the system. |
| GET    | `/tasks/my`                   | Logged in        | List tasks assigned to the current user (directly or via their role). |
| PATCH  | `/tasks/{id}/status`          | Assignee         | Move a task between `Pending` / `InProgress` / `Completed`. |
| PATCH  | `/tasks/{id}/assign`          | Admin / can-assign user | Reassign a task to a different user or role. |
| DELETE | `/tasks/{id}`                 | Admin            | Delete a task. |
| GET    | `/tasks/{id}/events`          | Logged in        | Return the audit trail (`TaskEvent`) for a task — who created/assigned/updated it and when. |
| GET    | `/tasks/notifications`        | Logged in        | List freshly-assigned tasks the user hasn't acknowledged yet. |
| POST   | `/tasks/notifications/ack`    | Logged in        | Acknowledge all pending notifications for the current user. |

### Roles, Menus, and Role-Menu Mapping

- `GET /roles` / `POST /roles` — list and create roles (Admin/Manager/User by default).
- `GET /menus` / `POST /menus` — list and create menu entries (Dashboard, My Task, Task Manager, User Manager, My Profile, Role Manager, …).
- `GET /mapping/{role}` — list menu IDs visible to a given role.
- `POST /mapping` — replace the menu list for a role (delete + insert in one transaction).
- `DELETE /mapping/{role}/{mid}` — remove one specific role/menu mapping (Admin only).
- `GET /mapping/list-all` — flat list of every mapping with names attached.

`DataInitializer` runs on startup and idempotently seeds the "Role Manager" menu, the Admin role (id 3), and the mapping between them, so a fresh DB is immediately usable.

### Reports — CSV exports (`/reports`)

Every endpoint streams `text/csv; charset=UTF-8` with `Content-Disposition: attachment`, so Excel and Google Sheets open them directly.

| Path                                  | Contents |
|---------------------------------------|----------|
| `GET /reports/tasks/all.csv`          | Every task in the system. |
| `GET /reports/tasks/my.csv`           | The current user's tasks. |
| `GET /reports/tasks/completion.csv`   | Per-user task-completion stats. |
| `GET /reports/users.csv`              | Every user with role name. |
| `GET /reports/mappings.csv`           | Every role-menu mapping. |

Authorization is enforced inside the service layer; a 403 returns a small `Forbidden` body.

### Cross-cutting backend pieces

- **JWT** — `JwtService` issues HS256 tokens with a 24-hour expiry; claims include `username` and `role`. All protected endpoints accept the token via the `Token` request header.
- **Audit log** — every meaningful task action writes a `TaskEvent` row (actor id, actor name, action, free-text detail). Audit failures never block the user action.
- **CORS** — handled per-controller with `@CrossOrigin(origins = "*")`. (`WebConfig` is intentionally empty; see comment in the file.)
- **OpenAPI / Swagger UI** — `springdoc-openapi-starter-webmvc-ui` is on the classpath; once the app is running, the docs are at `http://localhost:8000/swagger-ui.html`.
- **Mail** — `spring-boot-starter-mail` is included for future email notifications (SMTP config goes in `application.properties`).

---

## Frontend functionality

Built with React 19 + Vite. Routing is handled by React Router 7. State lives in component-local `useState`/`useReducer` plus the JWT in `localStorage`.

Pages and components:

- **Home / Sign-in / Sign-up** (`Home.jsx`) — landing page with the auth forms; submits to `/authservice/signin` and `/authservice/signup`.
- **Dashboard** (`Dashboard.jsx`) — role-aware summary cards (open tasks, completed tasks, overdue, etc.).
- **My Task** (`MyTask.jsx`) — the current user's task list, status changes, and per-task history viewer.
- **Task Manager** (`TaskManager.jsx`) — Admin view: create / edit / delete / assign tasks, bulk-import from CSV (see `sample-tasks.csv`).
- **Assign Tasks** (`AssignTasks.jsx`) — picker UI used by Admins and "can-assign" users to assign or reassign tasks.
- **Task History** (`TaskHistory.jsx`) — renders the `TaskEvent` audit trail for a task.
- **User Manager** (`UserManager.jsx`) — Admin view of all users; toggle the "can assign tasks" flag.
- **Roles Admin** (`RolesAdmin.jsx`) — Admin UI to add roles, add menus, and edit role-menu mappings.
- **My Profile** (`MyProfile.jsx`) — edit own name/phone and change password.
- **Theme Settings** (`ThemeSettings.jsx`) — light/dark and accent settings, persisted in `localStorage`.
- **Page Header / Floating Badge / Progress Bar** — shared UI chrome.

Helpers:

- `lib.js` — thin `fetch` wrapper that injects the JWT `Token` header and parses JSON responses.
- `exports.js` — client-side PDF/CSV export helpers via `jspdf` and `jspdf-autotable` (used in addition to the server-side CSV reports).

---

## Setup

### Prerequisites

- JDK **25** (matches `<java.version>25</java.version>` in `pom.xml`).
- Maven 3.9+ (or use the bundled `./mvnw` wrapper).
- PostgreSQL 13+ running locally.
- Node.js 18+ and npm for the frontend.

### 1. Database

```sql
CREATE DATABASE sec913mth;
```

Tables are created automatically by Hibernate (`spring.jpa.hibernate.ddl-auto=update`). Seed the lookup tables — see `backend/coreservices/Readme.txt` for the canonical `INSERT` snippets for `roles`, `menus`, and `rolesmapping`.

If you also insert the sample users from that file, **their passwords are plaintext (`1234`).** Log in once with each and the backend will rehash them to BCrypt automatically.

### 2. Backend

```bash
cd backend/coreservices
./mvnw spring-boot:run
```

The service starts on **http://localhost:8000**. Override DB credentials in `src/main/resources/application.properties`:

```
spring.datasource.url=jdbc:postgresql://localhost:5432/sec913mth
spring.datasource.username=postgres
spring.datasource.password=admin123
```

To build a deployable WAR:

```bash
./mvnw clean package
# → target/coreservices-0.0.1-SNAPSHOT.war
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app on **http://localhost:5173** by default. The backend base URL is wired through `lib.js` — update it there if the backend isn't on `http://localhost:8000`.

To build a production bundle:

```bash
npm run build      # → dist/
npm run preview    # serve the built bundle locally
```

---

## Default roles

| Role id | Name    | Notes |
|--------:|---------|-------|
| 1       | User    | Default role for self-signup. Sees Dashboard, My Task, My Profile. |
| 2       | Manager | Adds Task Manager. |
| 3       | Admin   | Full access: User Manager, Role Manager, all task and report endpoints. Cannot be selected at signup. |

Any user (any role) can be flagged `can_assign_tasks = 1` by an Admin to grant the "list users + assign tasks" capability without making them a Manager or Admin.

---

## Notes on the auth flow

1. Client `POST`s `{ username, password }` to `/authservice/signin`.
2. Backend loads the user, calls `BCryptPasswordEncoder.matches(...)`, and on success returns `{ code: 200, jwt: "<token>" }`.
3. Client stores the JWT and sends it on every subsequent request as the `Token` header.
4. Each protected controller calls `JwtService.validateJWT(token)` and pulls `username` / `role` out of the claims to enforce authorization.

There is no Spring Security filter chain — authorization is enforced in the service layer using the JWT claims. This keeps the code small but means every new endpoint must remember to call `JwtService.validateJWT(...)` and check the role itself.
