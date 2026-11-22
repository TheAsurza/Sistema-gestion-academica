# Entregable Final — Desarrollo de Interfaces III

**Proyecto:** Plataforma de Gestión de Cursos y Usuarios (Zegel)  
**Tecnologías:** Angular 22 (Standalone + Bootstrap 5) · PHP 8+ (PDO) · MySQL · JWT (HS256)

---

## 1. Enlace de GitHub del Proyecto

- **Repositorio GitHub:** `[URL_DEL_REPOSITORIO_GITHUB]`
- **Documentación de instalación y credenciales:** Disponible en el archivo raíz [`README.md`](../README.md), con instrucciones paso a paso para importar `backend/database.sql`, levantar el servidor PHP (`php -S localhost:8000 -t backend`) y ejecutar el frontend (`npm start`).

---

## 2. Explicación de Rutas y Guards Implementados

### 2.1 Tabla de Rutas (`frontend/src/app/app.routes.ts` y `features/**/*.routes.ts`)

| Ruta | Componente / Módulo Lazy | Layout | Guards | Roles permitidos (`data.roles`) | Comportamiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `AUTH_ROUTES` → `LoginComponent` | Independiente | `loginGuard` | Público (solo no autenticados) | Redirige a `/dashboard` si ya existe sesión vigente. |
| `/` | `MainLayoutComponent` → redirect a `dashboard` (`pathMatch: 'full'`) | `MainLayoutComponent` | `authGuard` | Todos los autenticados | Contenedor principal con barra superior y navegación lateral. |
| `/dashboard` | `DASHBOARD_ROUTES` → `DashboardComponent` | `MainLayoutComponent` | `authGuard` (heredado) | `admin`, `profesor`, `estudiante` | Vista resumen inicial autenticada. |
| `/courses` | `COURSES_ROUTES` → `CourseListComponent` | `MainLayoutComponent` | `authGuard` (heredado) | `admin`, `profesor`, `estudiante` | Listado filtrado por rol en backend y acciones CRUD según permisos. |
| `/courses/history` | `COURSES_ROUTES` → `CourseHistoryComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `['estudiante']` | Historial académico de cursos completados y notas finales. |
| `/users` | `USERS_ROUTES` → `UserListComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `['admin']` | Gestión completa de usuarios (CRUD). |
| `/reports` | `REPORTS_ROUTES` → `ReportsComponent` | `MainLayoutComponent` | `authGuard` + `roleGuard` | `['admin']` | Resumen estadístico de usuarios, cursos y matrículas. |
| `/unauthorized` | `UnauthorizedComponent` | Independiente | Ninguno | Público | Pantalla informativa de acceso denegado (`403` o `roleGuard`). |
| `**` | `NotFoundComponent` | Independiente | Ninguno | Público | Ruta comodín (404) para URLs inexistentes. |

### 2.2 Detalle de los Functional Guards (`frontend/src/app/core/guards/`)

1. **`authGuard` (`auth.guard.ts`)**:
   - Evalúa `authService.isAuthenticated()` (verifica presencia de token en `localStorage` bajo `auth_token` y que el claim `exp` del JWT no haya vencido).
   - Si es válido, retorna `true`; en caso contrario retorna `router.createUrlTree(['/login'])`.
2. **`loginGuard` (`login.guard.ts`)**:
   - Protege la ruta `/login` para usuarios que ya tienen sesión activa.
   - Si `authService.isAuthenticated()` es `true`, redirige mediante `router.createUrlTree(['/dashboard'])`; si no, permite el acceso a `/login`.
3. **`roleGuard` (`role.guard.ts`)**:
   - Primero valida `authService.isAuthenticated()`; si no está autenticado redirige a `/login`.
   - Luego lee `route.data['roles'] as UserRole[] | undefined` y comprueba `authService.hasRole(roles)`.
   - Si el usuario no posee ninguno de los roles requeridos, redirige a `/unauthorized`.

---

## 3. Servicios REST Integrados y Autenticación JWT

### 3.1 Endpoints REST del Backend (`backend/index.php`)

Base URL configurada en `frontend/src/environments/environment.ts`: `http://localhost:8000/api`.

| Método | Endpoint | Controlador PHP | Autenticación / RBAC | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `handleLogin` | Público | Valida email/password (`password_verify`), emite JWT HS256 (`exp = iat + 3600`) y datos del usuario. |
| `GET` | `/api/courses` | `handleGetCourses` | `requireAuth()` | `admin`: todos los cursos; `profesor`: solo cursos asignados (`teacher_id`); `estudiante`: cursos `active` con matrícula `enrolled`. Incluye `modules`. |
| `POST` | `/api/courses` | `handleCreateCourse` | `requireRole(['admin'])` | Crea curso y sincroniza módulos en transacción PDO (`201`). Valida código único (`409`). |
| `PUT` | `/api/courses/{id}` | `handleUpdateCourse` | `requireRole(['admin', 'profesor'])` | Actualiza curso y módulos. `profesor` solo puede editar cursos propios y no puede reasignar `teacher_id` (`403`). |
| `DELETE` | `/api/courses/{id}` | `handleDeleteCourse` | `requireRole(['admin'])` | Elimina un curso por ID (`404` si no existe). |
| `GET` | `/api/courses/check-code` | `handleCheckCourseCode` | `requireAuth()` | Verifica disponibilidad de código (`?code=...&excludeId=...`) para el validador asíncrono. |
| `GET` | `/api/enrollments/history` | `handleGetEnrollmentHistory` | `requireRole(['estudiante'])` | Retorna matrículas `completed` del estudiante autenticado con `final_grade` y bandera `passed` (`>= 13.0`). |
| `GET` | `/api/users` | `handleGetUsers` | `requireRole(['admin'])` | Lista usuarios (soporta filtro opcional `?role=`). |
| `POST` | `/api/users` | `handleCreateUser` | `requireRole(['admin'])` | Crea usuario con contraseña bcrypt (`201`). Valida email único (`409`). |
| `PUT` | `/api/users/{id}` | `handleUpdateUser` | `requireRole(['admin'])` | Actualiza nombre, email, rol y opcionalmente contraseña. |
| `DELETE` | `/api/users/{id}` | `handleDeleteUser` | `requireRole(['admin'])` | Elimina usuario. Impide auto-eliminación de la cuenta activa (`409`). |
| `GET` | `/api/users/check-email` | `handleCheckUserEmail` | `requireRole(['admin'])` | Verifica disponibilidad de correo (`?email=...&excludeId=...`) para el validador asíncrono. |
| `GET` | `/api/reports/summary` | `handleGetReportsSummary` | `requireRole(['admin'])` | Retorna conteos agregados `users_by_role`, `courses_by_status` y `enrollments`. |

### 3.2 Servicios Angular (`frontend/src/app/core/services/`)

- **`AuthService` (`auth.service.ts`)**: Gestiona `login()`, `logout()`, almacenamiento en `localStorage` (`auth_token`, `auth_user`), `BehaviorSubject<User | null>` (`currentUser$`), decodificación Base64URL del payload JWT para `isTokenExpired()`, `isAuthenticated()` y `hasRole()`.
- **`CourseService` (`course.service.ts`)**: Mantiene estado reactivo con `courses$`, implementa `getCourses()`, `createCourse()`, `updateCourse()`, `deleteCourse()`, `checkCodeAvailable()` y `getStudentHistory()`.
- **`UserService` (`user.service.ts`)**: Mantiene estado reactivo con `users$`, implementa `getUsers()`, `createUser()`, `updateUser()`, `deleteUser()` y `checkEmailAvailable()`.
- **`ReportService` (`report.service.ts`)**: Implementa `getSummary()` consumiendo `GET /api/reports/summary`.

### 3.3 Interceptores HTTP (`frontend/src/app/core/interceptors/`)

Registrados en `app.config.ts` mediante `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`:

1. **`authInterceptor` (`auth.interceptor.ts`)**:
   - Excluye la petición `/auth/login`.
   - Si existe token en `AuthService.getToken()`, verifica `authService.isTokenExpired(token)` antes de enviar la solicitud. Si expiró, ejecuta `authService.logout()` y retorna `EMPTY` cancelando la petición.
   - Si el token es válido, clona la petición agregando el header `Authorization: Bearer <token>`.
2. **`errorInterceptor` (`error.interceptor.ts`)**:
   - **`401 Unauthorized`** (fuera de `/auth/login`): ejecuta `authService.logout()` y muestra un `MatSnackBar` con `"Sesión expirada. Por favor, inicia sesión nuevamente."`.
   - **`403 Forbidden`**: navega a `/unauthorized` y muestra `"No tienes permisos para realizar esta acción."`.
   - **Otros códigos de error**: extrae `err.error.message` si existe o muestra un mensaje genérico en `MatSnackBar` y propaga el error con `throwError`.

---

## 4. Resultados de Pruebas Funcionales

> **Nota:** Completar cada espacio `[Adjuntar captura aquí]` con la captura de pantalla correspondiente antes de exportar este documento a PDF.

| ID | Escenario de Prueba | Pasos Ejecutados | Resultado Esperado | Estado | Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PF-01** | Login válido (`admin`, `profesor`, `estudiante`) | Ingresar credenciales de `backend/database.sql` (ej. `admin@zegel.edu.pe` / `password`) en `/login`. | `POST /api/auth/login` retorna `200` con JWT y `user`; guarda sesión y redirige a `/dashboard`. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-02** | Login inválido | Ingresar correo o contraseña incorrectos en `/login`. | `POST /api/auth/login` retorna `401`; muestra mensaje de error sin redirigir. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-03** | Expiración de token / `401` | Alterar/expirar `auth_token` en `localStorage` y ejecutar una petición autenticada. | `authInterceptor` detecta `exp` vencido o `errorInterceptor` captura `401`, ejecuta `logout()` y redirige a `/login`. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-04** | `loginGuard` | Con sesión activa, navegar manualmente a `/login`. | `loginGuard` intercepta y redirige automáticamente a `/dashboard`. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-05** | `authGuard` | Sin sesión activa (`localStorage` vacío), intentar acceder a `/dashboard` o `/courses`. | `authGuard` bloquea el acceso y redirige a `/login`. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-06** | `roleGuard` → `/unauthorized` | Iniciar sesión como `estudiante` o `profesor` y navegar a `/users` o `/reports` (o como `admin` a `/courses/history`). | `roleGuard` detecta rol no autorizado y redirige a `/unauthorized`. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-07** | Ruta wildcard 404 | Navegar a una ruta inexistente (ej. `/ruta-que-no-existe`). | Se renderiza `NotFoundComponent` sin romper la navegación. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-08** | CRUD de Cursos + `FormArray` + Validador Asíncrono | Como `admin`, abrir `CourseFormDialogComponent`, probar código duplicado (`DI3-401`), agregar/quitar módulos en `FormArray`, crear, editar y eliminar un curso. | Validador asíncrono marca `codeTaken`, `POST`/`PUT`/`DELETE /api/courses` persisten curso y módulos en MySQL. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-09** | Restricción de `profesor` en Cursos | Iniciar sesión como `carlos.mendoza@zegel.edu.pe`, listar cursos y editar uno propio. | Solo visualiza cursos asignados (`teacher_id = 2`), no ve botones de crear/eliminar (`*appHasRole`) y no puede reasignar docente (`403` en backend). | Aprobado | `[Adjuntar captura aquí]` |
| **PF-10** | Vista de `estudiante`: Cursos activos e Historial | Iniciar sesión como `anthony.quispe@zegel.edu.pe`, revisar `/courses` y `/courses/history`. | `/courses` muestra solo cursos `active` con matrícula `enrolled`; `/courses/history` muestra cursos `completed` con nota final y estado aprobado/desaprobado. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-11** | CRUD de Usuarios + Auto-eliminación `409` | Como `admin` en `/users`, probar email duplicado en `UserFormDialogComponent`, crear/editar/eliminar otro usuario e intentar eliminar la propia cuenta activa. | Validador asíncrono marca `emailTaken`; CRUD funciona y eliminar la cuenta propia retorna `409 Conflict`. | Aprobado | `[Adjuntar captura aquí]` |
| **PF-12** | Reportes administrativos | Como `admin`, acceder a `/reports`. | `GET /api/reports/summary` retorna métricas de `users_by_role`, `courses_by_status` y `enrollments` renderizadas en tarjetas. | Aprobado | `[Adjuntar captura aquí]` |
