# Zegel Desarrollo de Interfaces 3 — Final Deliverable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a role-based Educational Course & User Management SPA in Angular (Standalone + Angular Material) backed by a pure PHP + MySQL REST API with real HS256 JWT authentication, plus GitHub README and PDF deliverable documentation targeting 20/20 (Sobresaliente).

**Architecture:** Monorepo with `frontend/` (Angular 18/19+ Standalone, `provideRouter` with `loadChildren` lazy loading, functional guards `authGuard`/`roleGuard`/`loginGuard`, `HttpInterceptorFn` for JWT + global error/expiration handling, entity services with Observables, custom pipes & directives, reactive forms with `FormArray` and async validators) and `backend/` (pure PHP 8+ PDO/MySQL REST front-controller with CORS, `password_hash`, HS256 JWT with `exp`, and transactional CRUD).

**Tech Stack:** Angular Standalone, Angular Material, TypeScript, RxJS, PHP 8+ (PDO MySQL), MySQL 8 / MariaDB.

**Spec:** `docs/superpowers/specs/2026-11-21-zegel-interfaces-final-design.md`

## Global Constraints

- Angular Standalone architecture only (no `NgModules` or `RouterModule.forChild`); routing via `provideRouter(routes)` and `loadChildren`/`loadComponent`.
- Roles supported: `'admin' | 'profesor' | 'estudiante'`.
- Course statuses supported: `'active' | 'draft' | 'inactive'`.
- All API calls go through `HttpClient` to the PHP/MySQL backend; no in-memory mock arrays in Angular services.
- JWT token stored in `localStorage`, attached via `authInterceptor`, validated for client-side `exp` expiration and server-side `401`/`403` globally.
- `roleGuard` always redirects unauthorized role access to `/unauthorized`.

## Review Focus

- **Expired JWT in `localStorage` before API call:** `authGuard` and `authInterceptor` must decode `payload.exp`, detect expiration (`Date.now() >= exp * 1000`), clear `localStorage`, and redirect to `/login` without firing a doomed request.
- **`profesor` attempting to edit another teacher's course or change `teacher_id`:** PHP `PUT /api/courses/{id}` must verify `course.teacher_id === authUser.id` (403 otherwise) and ignore/reject `teacher_id` reassignment by `profesor`.
- **`admin` attempting to delete their own active account:** PHP `DELETE /api/users/{id}` must reject `id === authUser.id` with HTTP `409 Conflict` and Angular must surface the error message cleanly.
- **Duplicate email or course code during edit vs. create:** Async validators (`check-email`, `check-code`) must pass `excludeId` when editing an existing record so saving without changing email/code does not fail validation.
- **CORS preflight `OPTIONS` requests from Angular (`localhost:4200`) to PHP (`localhost:8000`):** PHP must respond `204`/`200` with `Access-Control-Allow-Headers: Content-Type, Authorization` before running auth checks.

---

### Task 1: Base de Datos MySQL y API REST en PHP con JWT

**Files:**
- Create: `backend/database.sql`
- Create: `backend/config/database.php`
- Create: `backend/helpers/jwt.php`
- Create: `backend/helpers/response.php`
- Create: `backend/index.php`

**Interfaces:**
- Produces HTTP REST API at `http://localhost:8000/api/*`:
  - `POST /api/auth/login` -> `{ token: string, user: { id, name, email, role } }`
  - `GET /api/courses`, `POST /api/courses`, `PUT /api/courses/{id}`, `DELETE /api/courses/{id}`
  - `GET /api/enrollments/history`
  - `GET /api/users`, `POST /api/users`, `PUT /api/users/{id}`, `DELETE /api/users/{id}`
  - `GET /api/users/check-email?email=&excludeId=` -> `{ available: boolean }`
  - `GET /api/courses/check-code?code=&excludeId=` -> `{ available: boolean }`
  - `GET /api/reports/summary`

- [ ] **Step 1: Create `backend/database.sql`**
  Define database `zegel_cursos_db` and tables `users` (`id`, `name`, `email` UNIQUE, `password_hash`, `role` ENUM('admin','profesor','estudiante'), `created_at`), `courses` (`id`, `code` UNIQUE, `title`, `description`, `credits`, `status` ENUM('active','draft','inactive'), `teacher_id` FK -> `users.id` ON DELETE SET NULL, `created_at`), `course_modules` (`id`, `course_id` FK -> `courses.id` ON DELETE CASCADE, `title`, `hours`, `sort_order`), `enrollments` (`id`, `student_id` FK -> `users.id` ON DELETE CASCADE, `course_id` FK -> `courses.id` ON DELETE CASCADE, `cycle`, `status` ENUM('enrolled','completed'), `final_grade` DECIMAL(4,2) NULL). Seed 1 admin, 2 profesores, 1 estudiante, 4 courses (active/draft/inactive), modules, active enrollments, and completed past-cycle enrollments with grades.

- [ ] **Step 2: Create `backend/config/database.php` and `backend/helpers/jwt.php`**
  Implement `getDbConnection(): PDO` with UTF-8 + `ERRMODE_EXCEPTION`, and `jwtEncode(array $payload, string $secret): string` / `jwtDecode(string $token, string $secret): ?array` using `hash_hmac('sha256', ...)` and `exp` validation.

- [ ] **Step 3: Create `backend/helpers/response.php`**
  Implement `sendCorsHeaders()` (handling `OPTIONS` preflight with 204), `jsonResponse(mixed $data, int $status = 200): never`, `getJsonBody(): array`, `requireAuth(): array` (returns 401 if missing/invalid/expired JWT), and `requireRole(array $roles): array` (returns 403 if role not allowed).

- [ ] **Step 4: Create `backend/index.php`**
  Implement front-controller routing for all `/api/*` endpoints:
  - Role-filtered `GET /api/courses` (`admin` all; `profesor` `WHERE teacher_id = :id`; `estudiante` enrolled `active` courses).
  - Transactional `POST`/`PUT /api/courses` syncing `course_modules`, enforcing `profesor` ownership and blocking `teacher_id` reassignment by `profesor`.
  - `DELETE /api/users/{id}` blocking self-deletion with `409`.
  - `GET /api/enrollments/history`, `GET /api/reports/summary`, and `check-email` / `check-code`.

- [ ] **Step 5: Verify PHP syntax and API contract**
  Run `Get-ChildItem -Recurse backend -Filter *.php | ForEach-Object { php -l $_.FullName }` (if PHP CLI is installed) and verify zero syntax errors.

---

### Task 2: Scaffolding Angular Standalone + Angular Material + Modelos

**Files:**
- Create: `frontend/` (via `ng new`)
- Create: `frontend/src/environments/environment.ts`
- Create: `frontend/src/app/core/models/auth.model.ts`
- Create: `frontend/src/app/core/models/user.model.ts`
- Create: `frontend/src/app/core/models/course.model.ts`
- Create: `frontend/src/app/core/models/enrollment.model.ts`
- Create: `frontend/src/app/core/models/report.model.ts`

**Interfaces:**
- Produces TypeScript types `UserRole = 'admin' | 'profesor' | 'estudiante'`, `CourseStatus = 'active' | 'draft' | 'inactive'`, `User`, `Course`, `CourseModule`, `EnrollmentHistory`, `LoginRequest`, `AuthResponse`, `JwtPayload`, `ReportSummary`, and `environment.apiUrl`.

- [ ] **Step 1: Scaffold Angular Standalone workspace**
  Run `npx -y @angular/cli new frontend --standalone --style=scss --routing --skip-git --skip-tests=false` inside the workspace root, then install `@angular/material` (`ng add @angular/material --skip-confirmation` or `npm install @angular/material @angular/cdk`).

- [ ] **Step 2: Configure `environment.ts` and `core/models/*.ts`**
  Set `apiUrl: 'http://localhost:8000/api'` in `environment.ts` and create strongly typed interfaces/classes in `core/models/`.

- [ ] **Step 3: Verify initial build**
  Run `npm run build` inside `frontend/`. Expected: exits with code 0.

---

### Task 3: Capa Core — `AuthService`, Interceptors y Guards

**Files:**
- Create: `frontend/src/app/core/services/auth.service.ts`
- Create: `frontend/src/app/core/interceptors/auth.interceptor.ts`
- Create: `frontend/src/app/core/interceptors/error.interceptor.ts`
- Create: `frontend/src/app/core/guards/auth.guard.ts`
- Create: `frontend/src/app/core/guards/role.guard.ts`
- Create: `frontend/src/app/core/guards/login.guard.ts`
- Modify: `frontend/src/app/app.config.ts`

**Interfaces:**
- Consumes: `environment.apiUrl`, `core/models/auth.model.ts`, `core/models/user.model.ts`.
- Produces:
  - `AuthService`: `currentUser$: Observable<User | null>`, `login(credentials): Observable<AuthResponse>`, `logout(): void`, `getToken(): string | null`, `isAuthenticated(): boolean`, `isTokenExpired(token: string): boolean`, `hasRole(roles: UserRole[]): boolean`, `getCurrentUser(): User | null`.
  - Functional `authInterceptor`, `errorInterceptor`, `authGuard`, `roleGuard`, `loginGuard`.

- [ ] **Step 1: Implement `AuthService`**
  Manage JWT token & user in `localStorage`, decode Base64URL payload to inspect `exp` (`isTokenExpired`), expose `BehaviorSubject<User | null>` (`currentUser$`), and handle `login()` / `logout()`.

- [ ] **Step 2: Implement `authInterceptor` and `errorInterceptor`**
  - `authInterceptor`: skip `/auth/login`; if token exists and is expired, call `logout()` + redirect `/login` and cancel with `EMPTY`/error; otherwise clone request with `Authorization: Bearer <token>`.
  - `errorInterceptor`: catch `HttpErrorResponse`; on `401` call `logout()` + navigate `/login` + snackbar; on `403` navigate `/unauthorized` + snackbar; rethrow normalized error.

- [ ] **Step 3: Implement `authGuard`, `roleGuard`, and `loginGuard`**
  - `authGuard`: allow if `authService.isAuthenticated()`, else `router.createUrlTree(['/login'])`.
  - `roleGuard`: read `route.data['roles'] as UserRole[]`, allow if `authService.hasRole(roles)`, else `router.createUrlTree(['/unauthorized'])`.
  - `loginGuard`: if `authService.isAuthenticated()`, return `router.createUrlTree(['/dashboard'])`, else `true`.

- [ ] **Step 4: Register `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))` and `provideAnimationsAsync()` in `app.config.ts`**

- [ ] **Step 5: Verify build**
  Run `npm run build` in `frontend/`. Expected: PASS.

---

### Task 4: Capa Shared — Pipes, Directivas, Layout Dinámico y Páginas de Error

**Files:**
- Create: `frontend/src/app/shared/pipes/role-label.pipe.ts`
- Create: `frontend/src/app/shared/pipes/course-status.pipe.ts`
- Create: `frontend/src/app/shared/directives/has-role.directive.ts`
- Create: `frontend/src/app/shared/directives/highlight-status.directive.ts`
- Create: `frontend/src/app/shared/components/main-layout/main-layout.component.ts`
- Create: `frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`
- Create: `frontend/src/app/shared/components/unauthorized/unauthorized.component.ts`
- Create: `frontend/src/app/shared/components/not-found/not-found.component.ts`

**Interfaces:**
- Consumes: `AuthService.currentUser$`, `UserRole`, `CourseStatus`.
- Produces: Standalone `RoleLabelPipe`, `CourseStatusPipe`, `HasRoleDirective`, `HighlightStatusDirective`, `MainLayoutComponent`, `ConfirmDialogComponent`, `UnauthorizedComponent`, `NotFoundComponent`.

- [ ] **Step 1: Create custom pipes (`RoleLabelPipe`, `CourseStatusPipe`)**
  Transform `'admin' | 'profesor' | 'estudiante'` and `'active' | 'draft' | 'inactive'` into Spanish labels.

- [ ] **Step 2: Create custom directives (`HasRoleDirective`, `HighlightStatusDirective`)**
  - `HasRoleDirective` (`*appHasRole="['admin']"`): structural directive subscribing to `AuthService.currentUser$` and rendering/clearing `TemplateRef` in `ViewContainerRef`.
  - `HighlightStatusDirective` (`[appHighlightStatus]="course.status"`): attribute directive applying badge/chip colors (`active` green, `draft` amber, `inactive` gray).

- [ ] **Step 3: Create `MainLayoutComponent`, `ConfirmDialogComponent`, `UnauthorizedComponent`, `NotFoundComponent`**
  `MainLayoutComponent` renders Material `MatSidenav` + `MatToolbar` with dynamic navigation links filtered by role, user badge (`RoleLabelPipe`), logout button, and `<router-outlet>`.

- [ ] **Step 4: Verify build**
  Run `npm run build` in `frontend/`. Expected: PASS.

---

### Task 5: Servicios REST por Entidad y Enrutamiento Modular con Lazy Loading

**Files:**
- Create: `frontend/src/app/core/services/course.service.ts`
- Create: `frontend/src/app/core/services/user.service.ts`
- Create: `frontend/src/app/core/services/report.service.ts`
- Create: `frontend/src/app/features/auth/auth.routes.ts`
- Create: `frontend/src/app/features/dashboard/dashboard.routes.ts`
- Create: `frontend/src/app/features/courses/courses.routes.ts`
- Create: `frontend/src/app/features/users/users.routes.ts`
- Create: `frontend/src/app/features/reports/reports.routes.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Produces:
  - `CourseService`: `getCourses()`, `createCourse()`, `updateCourse()`, `deleteCourse()`, `checkCodeAvailable()`, `getStudentHistory()`.
  - `UserService`: `getUsers()`, `createUser()`, `updateUser()`, `deleteUser()`, `checkEmailAvailable()`.
  - `ReportService`: `getSummary()`.
  - Lazy-loaded feature routes protected by `loginGuard`, `authGuard`, `roleGuard`, plus `/unauthorized` and `**` -> `NotFoundComponent`.

- [ ] **Step 1: Implement `CourseService`, `UserService`, `ReportService`**
  Each service uses `HttpClient`, returns typed `Observable`s, manages reactive state (`BehaviorSubject`) where helpful, and uses `catchError` for clean error propagation.

- [ ] **Step 2: Create feature `*.routes.ts` files and configure `app.routes.ts`**
  Use `MainLayoutComponent` as parent route protected by `authGuard`, with `loadChildren` for `dashboard`, `courses`, `users` (`data: { roles: ['admin'] }`), and `reports` (`data: { roles: ['admin'] }`), plus `/login` (`loginGuard`), `/unauthorized`, `'' -> '/dashboard'`, and `** -> NotFoundComponent`.

- [ ] **Step 3: Verify build and lazy chunks**
  Run `npm run build` in `frontend/`. Expected: PASS with lazy chunk files listed in output.

---

### Task 6: Features — Login, Dashboard por Rol y Cursos (con `FormArray` + Validador Asíncrono + Historial)

**Files:**
- Create: `frontend/src/app/features/auth/login/login.component.ts`
- Create: `frontend/src/app/features/dashboard/dashboard.component.ts`
- Create: `frontend/src/app/features/courses/course-list/course-list.component.ts`
- Create: `frontend/src/app/features/courses/course-form-dialog/course-form-dialog.component.ts`
- Create: `frontend/src/app/features/courses/course-history/course-history.component.ts`

**Interfaces:**
- Consumes: `AuthService`, `CourseService`, `UserService` (for teacher dropdown when `admin`), `ReportService` (only when `admin`), `RoleLabelPipe`, `CourseStatusPipe`, `HasRoleDirective`, `HighlightStatusDirective`, `ConfirmDialogComponent`.

- [ ] **Step 1: Implement `LoginComponent`**
  Reactive form (`email`, `password` with sync validators), loading spinner, error alert, and quick-fill demo hint for testing.

- [ ] **Step 2: Implement `DashboardComponent`**
  Role-aware dashboard: `admin` loads `ReportService.getSummary()`; `profesor` loads `CourseService.getCourses()` to show assigned courses count; `estudiante` loads active courses + `getStudentHistory()` summary.

- [ ] **Step 3: Implement `CourseListComponent` and `CourseFormDialogComponent`**
  - `CourseListComponent`: `MatTable` with search filter, `CourseStatusPipe`, `[appHighlightStatus]`, `*appHasRole` action buttons (`admin` create/edit/delete; `profesor` edit assigned; `estudiante` view details + link/tab to Historial).
  - `CourseFormDialogComponent`: `ReactiveFormsModule` + `FormArray` for `modules` (add/remove module rows dynamically) + `AsyncValidatorFn` on `code` calling `CourseService.checkCodeAvailable(code, excludeId)`.

- [ ] **Step 4: Implement `CourseHistoryComponent` (`/courses/history`)**
  Protected by `roleGuard` (`['estudiante']`), displays past cycles, course code/title, final grade, and approved/failed status badge.

- [ ] **Step 5: Verify build**
  Run `npm run build` in `frontend/`. Expected: PASS.

---

### Task 7: Features — Gestión de Usuarios (`admin`), Reportes (`admin`) y Verificación E2E

**Files:**
- Create: `frontend/src/app/features/users/user-list/user-list.component.ts`
- Create: `frontend/src/app/features/users/user-form-dialog/user-form-dialog.component.ts`
- Create: `frontend/src/app/features/reports/reports.component.ts`

- [ ] **Step 1: Implement `UserListComponent` and `UserFormDialogComponent`**
  - `MatTable` displaying users with `RoleLabelPipe`, create/edit/delete actions (`ConfirmDialogComponent`), and friendly error display if attempting self-deletion (`409`).
  - `UserFormDialogComponent`: reactive form with `AsyncValidatorFn` on `email` calling `UserService.checkEmailAvailable(email, excludeId)`.

- [ ] **Step 2: Implement `ReportsComponent`**
  Consumes `ReportService.getSummary()` to render Material summary cards (total users by role, courses by status, total enrollments).

- [ ] **Step 3: Verify production build & static checks**
  Run `npm run build` in `frontend/`. Expected: PASS with 0 errors.

- [ ] **Step 4: Functional End-to-End Verification (when MySQL & PHP are running)**
  Verify login for `admin`, `profesor`, `estudiante`, CRUD on courses/users, `FormArray` + async validator behavior, `roleGuard` -> `/unauthorized`, `**` -> 404, and expired JWT -> `/login`.

---

### Task 8: Documentación GitHub (`README.md`) y Entregable PDF (`docs/entregable-final.md`)

**Files:**
- Create: `README.md`
- Create: `docs/entregable-final.md`

- [ ] **Step 1: Create root `README.md`**
  Include project overview, tech stack, prerequisites (Node, Angular CLI, PHP 8+, MySQL), step-by-step installation (`database.sql` import, `backend/config/database.php` config, `php -S localhost:8000`, `npm install && ng serve`), and test credentials for `admin`, `profesor`, and `estudiante`.

- [ ] **Step 2: Create `docs/entregable-final.md`**
  Include all 4 rubric PDF sections:
  1. Explicación detallada de rutas (lazy loading, anidadas, redirecciones, 404) y guards (`authGuard`, `roleGuard`, `loginGuard`).
  2. Información de servicios REST integrados y autenticación JWT (`HttpInterceptor`, `exp`, manejo global de errores).
  3. Enlace de GitHub del proyecto + referencia al `README.md`.
  4. Matriz de resultados de pruebas funcionales (con espacios marcados para pegar las capturas de pantalla antes de exportar a PDF).
