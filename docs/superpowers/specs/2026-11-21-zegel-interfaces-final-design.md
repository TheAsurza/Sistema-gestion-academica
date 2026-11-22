# Design Document: Sistema de Gestión de Cursos y Usuarios (Zegel — Desarrollo de Interfaces 3)

**Fecha:** 2026-11-21  
**Objetivo:** Entregable final (SPA en Angular + API REST en PHP/MySQL + Documento PDF) apuntando a calificación **Sobresaliente (20/20)** en los 5 criterios de la rúbrica y cumpliendo los lineamientos del sílabo.

---

## 1. Propósito y Contexto
Una institución educativa necesita digitalizar la gestión centralizada de **cursos y usuarios**, reemplazando procesos manuales sin control de acceso. El sistema debe ofrecer una interfaz SPA fluida y segura donde cada tipo de usuario (`admin`, `profesor`, `estudiante`) acceda únicamente a las vistas y acciones que le corresponden mediante autenticación **JWT** y enrutamiento protegido.

---

## 2. Metas, No-Metas y Anti-Metas

### Metas (Goals)
1. **Arquitectura y Buenas Prácticas (4 pts):**
   - Angular moderno con **Standalone Components** y separación clara en `core/` (guards, interceptors, services, models), `shared/` (pipes y directivas personalizadas, componentes reutilizables) y `features/` (módulos funcionales).
   - Programación Orientada a Objetos y tipado estricto en TypeScript (interfaces/modelos para `User`, `Course`, `AuthResponse`, `JwtPayload`, `ApiError`).
   - Implementación de **pipes personalizados** (p. ej. `RoleLabelPipe`, `CourseStatusPipe`) y **directivas personalizadas** (p. ej. `HasRoleDirective` para visibilidad condicional por rol y `HighlightStatusDirective` para resaltado visual).
   - Formularios reactivos (`ReactiveFormsModule`) con **validaciones síncronas y asíncronas** (como indica el sílabo, p. ej. validación asíncrona de correo único al crear/editar usuario o código único de curso) y manejo de formularios dinámicos (`FormArray` para sílabo/temario o módulos del curso).
2. **Enrutamiento Modular y Lazy Loading (4 pts):**
   - `provideRouter(routes)` con archivos de rutas separados por funcionalidad (`auth.routes.ts`, `dashboard.routes.ts`, `courses.routes.ts`, `users.routes.ts`, `reports.routes.ts`).
   - Carga diferida (`loadChildren` / `loadComponent`), rutas anidadas dentro de un layout principal autenticado (Sidenav + Toolbar), redirecciones automáticas (`'' -> '/dashboard'`), página de acceso denegado (`/unauthorized`) y manejo de rutas inexistentes (`'**' -> NotFoundComponent`).
3. **Múltiples Guards (4 pts):**
   - `authGuard` (`CanActivateFn` / `CanMatchFn`): verifica existencia de token JWT en `localStorage` y que no haya expirado (`exp`); si falla, limpia sesión y redirige a `/login`.
   - `roleGuard`: valida que el rol del usuario autenticado coincida con `route.data['roles']`; si no tiene permiso, redirige a `/unauthorized` (o `/dashboard`).
   - `loginGuard`: impide que un usuario ya autenticado entre a `/login`, redirigiéndolo a `/dashboard`.
4. **Integración con API REST (4 pts):**
   - `HttpClient` configurado con `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`.
   - Servicios separados por entidad (`AuthService`, `CourseService`, `UserService`, `ReportService`) centralizando la URL base desde `environment.ts`.
   - Operaciones completas **`GET`, `POST`, `PUT`, `DELETE`** para cursos y usuarios.
   - Gestión reactiva del flujo de datos con **Observables** (`BehaviorSubject` / `Observable`) y manejo centralizado de errores (`HttpErrorResponse` + `catchError` + interceptor).
5. **Autenticación JWT (4 pts):**
   - El backend PHP emite un **JWT real** (HMAC-SHA256) con `sub`, `name`, `email`, `role`, `iat` y `exp`.
   - El frontend almacena el token en `localStorage`, un `HttpInterceptor` lo adjunta automáticamente en la cabecera `Authorization: Bearer <token>`, verifica expiración (`exp`) en el cliente antes de enviar peticiones y captura respuestas `401`/`403` globalmente para cerrar sesión o mostrar acceso denegado.
6. **Vistas dinámicas según rol:**
   - **Menú lateral dinámico** según el rol del usuario autenticado.
   - **`admin`:** Dashboard general (consumiendo `GET /api/reports/summary`), CRUD completo de Cursos (incluyendo asignación de `teacher_id`), CRUD completo de Usuarios, vista de Reportes (totales por rol, cursos por estado, etc.).
   - **`profesor`:** Dashboard (métricas calculadas desde `GET /api/courses`), listado y edición únicamente de sus cursos asignados (`teacher_id` del usuario autenticado; puede editar contenido/temario, sin acceso a gestión de usuarios ni reportes administrativos).
   - **`estudiante`:** Dashboard (métricas calculadas desde sus cursos/historial), vista de sus **cursos activos** matriculados y vista/pestaña de **historial de notas de ciclos pasados** (solo lectura, con ciclo, curso, nota final y estado).
7. **Decisiones de comportamiento y reglas de negocio confirmadas:**
   - **Estados de curso y temario (`FormArray`):** los cursos manejan estados `active`, `draft` e `inactive`. Los módulos del temario (`course_modules`) se envían y actualizan anidados dentro de `POST`/`PUT /api/courses` mediante transacción PDO.
   - **Eliminación de usuarios:** borrado físico (`DELETE /api/users/{id}`) con `ON DELETE SET NULL` en `courses.teacher_id` y `ON DELETE CASCADE` en `enrollments.student_id`, bloqueando (`409 Conflict`) si un `admin` intenta eliminar su propia cuenta activa.
   - **Acceso denegado (`roleGuard`):** cuando un usuario no tiene el rol requerido, redirige siempre a `/unauthorized` (página 403 con botón de regreso al Dashboard).
7. **Entregables de repositorio y documentación:**
   - Estructura lista para GitHub con `README.md` completo (requisitos, importación de `database.sql` en MySQL, configuración de PHP y Angular, credenciales de prueba para los 3 roles).
   - Documento base en Markdown/HTML listo para exportar a PDF con: explicación de rutas y guards, tabla de endpoints REST, enlace al repositorio y matriz de pruebas funcionales (para completar con capturas de pantalla).

### No-Metas (Non-Goals)
- No se requiere despliegue en la nube (se ejecuta localmente con Angular CLI + PHP + MySQL).
- No se requieren pruebas unitarias automatizadas (`Karma/Jasmine`), ya que el docente confirmó que las pruebas funcionales son la demostración de las funcionalidades (matriz + capturas).
- No se implementa refresh token ni recuperación de contraseña por correo.

### Anti-Metas (Anti-Goals)
- No usar `NgModules` innecesarios ni mezclar `RouterModule.forChild` artificialmente; seguir la convención moderna Standalone indicada por el docente.
- No simular respuestas CRUD dentro de Angular con arrays en memoria; toda operación debe pasar por `HttpClient` hacia la API PHP + MySQL.
- No dejar endpoints sin verificación de token/rol en PHP ni rutas sin guards en Angular.

---

## 3. Enfoques Considerados y Decisión

| Enfoque | Descripción | Trade-offs | Estado |
|---|---|---|---|
| **A. Angular Standalone + Angular Material + PHP/SQLite** | SPA moderna con Material y API PHP usando archivo SQLite local. | Cero configuración de BD, pero menos familiar si el equipo ya usa XAMPP/MySQL. | Descartado |
| **B. Angular Standalone + Bootstrap 5 + PHP/MySQL** | SPA moderna con Bootstrap 5 y API PHP conectada a MySQL. | Familiar en XAMPP, pero Bootstrap requiere más armado manual para diálogos/tablas Material. | Descartado |
| **Elegido: Angular Standalone + Angular Material + PHP/MySQL** | SPA moderna con **Angular Material** (`MatTable`, `MatDialog`, `MatSidenav`, `MatSnackBar`, `MatPaginator`) + API REST en **PHP puro (PDO + MySQL)** con script `database.sql`. | Requiere importar `database.sql` en MySQL (XAMPP/Laragon/MySQL local), a cambio ofrece componentes UI profesionales listos para CRUD y alineación total con el entorno del curso. | **Aprobado por el usuario** |

---

## 4. Arquitectura y Decisiones Técnicas

### 4.1. Estructura del Proyecto (Monorepo en la carpeta de entrega)
- `frontend/` — Aplicación Angular Standalone + Angular Material.
  - `src/app/core/` — `models/`, `services/` (`auth.service.ts`, `course.service.ts`, `user.service.ts`, `report.service.ts`), `guards/` (`auth.guard.ts`, `role.guard.ts`, `login.guard.ts`), `interceptors/` (`auth.interceptor.ts`, `error.interceptor.ts`).
  - `src/app/shared/` — `pipes/` (`role-label.pipe.ts`, `course-status.pipe.ts`), `directives/` (`has-role.directive.ts`, `highlight-status.directive.ts`), `components/` (layout principal con sidenav/toolbar, diálogo de confirmación, página 404 y 403).
  - `src/app/features/` — `auth/` (login), `dashboard/`, `courses/` (lista, formulario modal con `FormArray` + validador asíncrono), `users/` (lista, formulario modal con validador asíncrono de email único), `reports/` (resumen para `admin`).
- `backend/` — API REST en PHP puro (PDO + MySQL).
  - `config/database.php` — Conexión PDO a MySQL (host, dbname, user, pass).
  - `helpers/jwt.php` — Generación y validación HS256 con `exp`.
  - `helpers/response.php` — Respuestas JSON estándar, manejo de CORS (`Access-Control-Allow-Origin`, `Authorization`, `OPTIONS`) y validación de middleware auth/role.
  - `routes/` o `index.php` — Front controller REST para `/api/auth/login`, `/api/courses`, `/api/users`, `/api/reports/summary`, `/api/users/check-email`, `/api/courses/check-code`.
  - `database.sql` — Creación de base de datos, tablas (`users`, `courses`, `course_modules`, `enrollments`) y datos semilla (usuarios de prueba para `admin`, `profesor`, `estudiante`, cursos activos/pasados y matrículas con notas de ciclos pasados).
- `docs/` — Documentación técnica y guía del entregable PDF.

### 4.2. Contrato Mínimo de la API REST
- `POST /api/auth/login` → Valida credenciales y retorna `{ token, user: { id, name, email, role } }`.
- `GET /api/courses` → Protegido por JWT: `admin` ve todos los cursos; `profesor` ve solo los cursos donde `teacher_id = user.id`; `estudiante` ve solo sus cursos activos (`courses.status = 'active'` y matrícula `enrolled`).
- `POST /api/courses`, `PUT /api/courses/{id}`, `DELETE /api/courses/{id}` → `POST/DELETE` restringidos a `admin`; `PUT` permitido a `admin` y al `profesor` asignado a ese curso (validado en backend; `profesor` no puede reasignar `teacher_id`). Incluye `modules` (`course_modules`) en transacción PDO.
- `GET /api/enrollments/history` → Protegido por JWT (`estudiante`), retorna el historial de cursos completados de ciclos pasados con su `cycle`, `final_grade` y estado.
- `GET /api/users`, `POST /api/users`, `PUT /api/users/{id}`, `DELETE /api/users/{id}` → Protegidos por JWT y restringidos a `admin` (bloquea auto-eliminación con `409`).
- `GET /api/users/check-email?email=...&excludeId=...` y `GET /api/courses/check-code?code=...&excludeId=...` → Endpoints ligeros para los **validadores asíncronos** de los formularios reactivos.
- `GET /api/reports/summary` → Estadísticas agregadas para el módulo de reportes (`admin`).

---

## 5. Decisiones Dejadas al Implementador
- Versión exacta de Angular CLI instalada en el entorno (18/19+ Standalone) y paleta de tema de Angular Material.
- Puertos locales por defecto (`4200` para Angular, `8000` para `php -S` o Apache en XAMPP, `3306` para MySQL) configurables en `environment.ts` y `database.php`.
- Detalle visual de las tarjetas del dashboard, columnas exactas de tablas y textos de validación.
- Datos semilla específicos (nombres de cursos y usuarios de ejemplo).
