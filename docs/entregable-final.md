# Informe Técnico — Desarrollo de Interfaces III

**Proyecto:** Plataforma Web de Gestión Académica (Zegel)  
**Tecnologías:** Angular 22 Standalone + Bootstrap 5 · PHP 8+ (PDO) · MySQL · JWT (HS256)

---

## 1. Enlace de GitHub del Proyecto

- **Repositorio GitHub:** *(Enlace del repositorio GitHub del equipo)*
- **Instrucciones de instalación y ejecución:** Documentadas en [`README.md`](../README.md), con guía paso a paso para importar `backend/database.sql`, configurar `backend/config/database.php`, levantar la API PHP (`php -S localhost:8000 -t backend`) y ejecutar el frontend Angular (`npm start`).

---

## 2. Explicación de Rutas y Guards Implementados

### 2.1 Tabla de Rutas (`frontend/src/app/app.routes.ts` y `features/**/*.routes.ts`)

| Ruta | Módulo Lazy / Componente | Layout | Guards | Roles (`data.roles`) | Comportamiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `AUTH_ROUTES` → `LoginComponent` | Independiente | `loginGuard` | Público | Redirige a `/dashboard` si ya existe sesión vigente. |
| `/` | Redirección a `/dashboard` (`pathMatch: 'full'`) | `MainLayoutComponent` | `authGuard` | Autenticados | Redirección inicial hacia el panel principal. |
| `/dashboard` | `DASHBOARD_ROUTES` → `DashboardComponent` | `MainLayoutComponent` | `authGuard` | `admin`, `profesor`, `estudiante` | Resumen adaptado por rol, calendario semanal, agenda y avisos. |
| `/courses` | `COURSES_ROUTES` → `CourseListComponent` | `MainLayoutComponent` | `authGuard` | `admin`, `profesor`, `estudiante` | Catálogo filtrado por rol con búsqueda, filtro por carrera y estado. |
| `/courses/:id` | `COURSES_ROUTES` → `CourseDetailComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `admin`, `profesor` | Gestión interna del curso: Alumnos y Notas, Asistencia y Sílabo. |
| `/courses/:id/view` | `COURSES_ROUTES` → `StudentCourseViewComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `estudiante` | Vista del alumno: sílabo, asistencia por sesión y evaluaciones. |
| `/courses/history` | `COURSES_ROUTES` → `CourseHistoryComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `estudiante` | Historial y Boleta de Notas con filtro por ciclo y exportación CSV/PDF. |
| `/teachers` | `TEACHERS_ROUTES` → `TeacherListComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `admin` | Directorio CRUD de profesores, cursos asignados y clases. |
| `/students` | `STUDENTS_ROUTES` → `StudentListComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `admin` | Directorio CRUD de alumnos, carrera y matrícula/retiro de cursos. |
| `/staff` | `STAFF_ROUTES` → `StaffListComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `admin` | Directorio CRUD de personal administrativo. |
| `/users` | Redirección a `/students` | `MainLayoutComponent` | `authGuard` | `admin` | Compatibilidad de ruta heredada. |
| `/agenda` | `AGENDA_ROUTES` → `TeacherAgendaComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `admin`, `profesor`, `estudiante` | Gestión de agenda para docentes/admin y consulta de solo lectura para alumnos. |
| `/reports` | `REPORTS_ROUTES` → `ReportsComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `admin`, `profesor` | Reportes ejecutivos/docentes con exportación CSV e impresión PDF. |
| `/unauthorized` | `UnauthorizedComponent` | Independiente | Ninguno | Público | Pantalla informativa de acceso denegado (`403` o `roleGuard`). |
| `**` | `NotFoundComponent` | Independiente | Ninguno | Público | Ruta comodín (404) para URLs inexistentes. |

### 2.2 Functional Guards (`frontend/src/app/core/guards/`)

1. **`authGuard` (`auth.guard.ts`)**: Verifica `authService.isAuthenticated()` (token presente en `localStorage` y claim `exp` vigente). Si no es válido, redirige a `/login`.
2. **`loginGuard` (`login.guard.ts`)**: Impide que un usuario autenticado vuelva a `/login`, redirigiéndolo a `/dashboard`.
3. **`roleGuard` (`role.guard.ts`)**: Valida sesión activa y comprueba `authService.hasRole(route.data['roles'])`; si el rol no está autorizado, redirige a `/unauthorized`.

---

## 3. Servicios REST Integrados y Autenticación JWT

Base URL en `frontend/src/environments/environment.ts`: `http://localhost:8000/api`.

### 3.1 Endpoints del Backend (`backend/index.php` + `backend/controllers/*.php`)

| Método | Endpoint | Controlador | Seguridad | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `auth.php` | Público | Valida credenciales (`password_verify`), emite JWT HS256 (`exp = iat + 3600`). |
| `GET/POST/PUT/DELETE` | `/api/courses`, `/api/courses/{id}` | `courses.php` | `requireAuth` / `requireRole` | CRUD de cursos y módulos; filtrado por rol (`admin`, `profesor`, `estudiante`). |
| `GET` | `/api/courses/check-code` | `courses.php` | `requireAuth()` | Validador asíncrono de código único de curso. |
| `GET` | `/api/courses/{id}/my-view` | `courses.php` | `requireRole(['estudiante'])` | Sílabo, asistencia detallada y próximas evaluaciones del curso. |
| `GET/POST/PUT/DELETE` | `/api/users`, `/api/users/{id}`, `/api/teachers`, `/api/students`, `/api/staff` | `users.php` | `requireRole(['admin'])` | CRUD de usuarios con generación automática de `user_code` (`ADM-`, `DOC-`, `ALU-`). |
| `GET` | `/api/users/check-email` | `users.php` | `requireRole(['admin'])` | Validador asíncrono de correo electrónico único. |
| `POST/DELETE/PUT` | `/api/enrollments`, `/api/enrollments/{id}`, `/api/enrollments/{id}/grade`, `/api/enrollments/history` | `enrollments.php` | RBAC por rol | Matrícula/retiro, registro de notas (`0–20`) e historial del alumno. |
| `GET/PUT` | `/api/attendance/weekly`, `/api/courses/{id}/attendance` | `attendance.php` | `admin` / `profesor` | Asistencia semanal y registro por sesión (*Presente / Tardanza / Falta*). |
| `GET/POST/DELETE` | `/api/agenda`, `/api/agenda/{id}`, `/api/notices` | `dashboard.php` | `requireAuth` / `admin, profesor` | Agenda académica y avisos institucionales. |
| `GET` | `/api/reports/summary` | `reports.php` | `requireRole(['admin', 'profesor'])` | KPIs, rendimiento por curso y carga horaria. |

### 3.2 Servicios e Interceptores Angular

- **Servicios (`core/services/`)**: `AuthService`, `CourseService`, `UserService`, `ReportService`, `DashboardWidgetService` y `ToastService`.
- **Interceptores (`core/interceptors/` en `app.config.ts`)**:
  - `authInterceptor`: valida expiración del JWT antes de cada petición e inserta `Authorization: Bearer <token>`.
  - `errorInterceptor`: intercepta `401` (cierra sesión y redirige a `/login`), `403` (redirige a `/unauthorized`) y errores globales con `ToastService`.

---

## 4. Plan de Pruebas Funcionales (Demostración en Vivo)

Las siguientes pruebas funcionales están validadas y listas para su demostración en vivo durante la exposición:

| ID | Escenario | Flujo de Verificación | Resultado |
| :--- | :--- | :--- | :--- |
| **PF-01** | Login y emisión JWT | Ingresar como `admin`, `profesor` o `estudiante` en `/login` y verificar JWT en respuesta y `localStorage`. | Aprobado |
| **PF-02** | Protección de Guards (`authGuard`, `loginGuard`, `roleGuard`) | Intentar acceso sin sesión, acceso a `/login` autenticado y acceso cruzado entre roles. | Aprobado |
| **PF-03** | Expiración / manipulación de token (`401`) | Alterar el token en `localStorage` y ejecutar petición autenticada para validar cierre de sesión automático. | Aprobado |
| **PF-04** | Gestión de Cursos y Usuarios (Admin) | Crear/editar/eliminar cursos (`FormArray` + validador asíncrono), profesores, alumnos (`user_code` automático) y matrícula/retiro. | Aprobado |
| **PF-05** | Gestión Docente (`profesor`) | Abrir curso en `/courses/:id`, registrar notas (`0–20`), tomar asistencia por sesión, gestionar `/agenda` y revisar `/reports`. | Aprobado |
| **PF-06** | Portal del Alumno (`estudiante`) | Consultar `/courses/:id/view` (sílabo y asistencia), `/courses/history` (Boleta + CSV/PDF) y `/agenda` en solo lectura. | Aprobado |
