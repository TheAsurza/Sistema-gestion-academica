# Zegel — Plataforma de Gestión de Cursos y Usuarios (Desarrollo de Interfaces III)

Aplicación web **SPA (Single Page Application)** desarrollada con **Angular 22 Standalone + Bootstrap 5** y un backend **REST API en PHP 8+ (PDO / MySQL)** con autenticación **JWT (HS256)** y control de acceso basado en roles (**RBAC**).

---

## Arquitectura General

- **`frontend/`**: Aplicación Angular Standalone (`@angular/core`, `bootstrap`, `bootstrap-icons`, `rxjs`) con rutas lazy-loaded, layout principal autenticado (`MainLayoutComponent`), 3 functional guards (`authGuard`, `loginGuard`, `roleGuard`), 2 interceptores HTTP funcionales (`authInterceptor`, `errorInterceptor`), formularios reactivos con `FormArray` y validadores asíncronos, pipes personalizados y directivas estructurales/de atributo.
- **`backend/`**: API REST en PHP 8+ sin frameworks externos, con conexión **PDO** a MySQL (`zegel_cursos_db`), autenticación **JWT HS256** (`backend/helpers/jwt.php`, TTL de `3600` segundos), cabeceras CORS y validación estricta de roles en cada endpoint (`backend/index.php`, `backend/helpers/response.php`).

---

## Prerrequisitos

- **Node.js** (v20+ recomendado) y **npm**
- **Angular CLI** (`@angular/cli` v22+)
- **PHP 8.1+** con extensión `pdo_mysql` habilitada
- **MySQL 8+ / MariaDB** (o paquete **XAMPP** / Laragon)

---

## Instalación y Ejecución Paso a Paso

### 1. Base de datos MySQL

Importar el script SQL `backend/database.sql` en MySQL o phpMyAdmin. Este script crea la base de datos `zegel_cursos_db`, las tablas (`users`, `courses`, `course_modules`, `enrollments`) y los datos semilla:

```bash
mysql -u root -p < backend/database.sql
```

### 2. Configuración del Backend

Verificar los parámetros de conexión en `backend/config/database.php` (por defecto usa `127.0.0.1:3306`, base de datos `zegel_cursos_db`, usuario `root` y contraseña vacía, o variables de entorno `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET`).

### 3. Iniciar el Servidor PHP

Desde la raíz del proyecto, levantar el servidor embebido de PHP apuntando a `backend/`:

```bash
php -S localhost:8000 -t backend
```

> **Alternativa Apache/XAMPP:** Ubicar la carpeta del proyecto bajo `htdocs` y ajustar `apiUrl` en `frontend/src/environments/environment.ts` si la URL base difiere de `http://localhost:8000/api`.

### 4. Instalar y Ejecutar el Frontend

En otra terminal:

```bash
cd frontend
npm install
npm start
```

La aplicación estará disponible en: **http://localhost:4200**

---

## Credenciales de Prueba

Todos los usuarios semilla definidos en `backend/database.sql` utilizan la contraseña: **`password`** (almacenada con hash bcrypt).

| Rol | Nombre | Correo electrónico | Contraseña |
| :--- | :--- | :--- | :--- |
| `admin` | Administrador Zegel | `admin@zegel.edu.pe` | `password` |
| `profesor` | Prof. Carlos Mendoza | `carlos.mendoza@zegel.edu.pe` | `password` |
| `profesor` | Prof. Lucía Paredes | `lucia.paredes@zegel.edu.pe` | `password` |
| `estudiante` | Anthony Quispe | `anthony.quispe@zegel.edu.pe` | `password` |

---

## Estructura del Proyecto

```text
.
├── backend/
│   ├── config/
│   │   └── database.php          # Conexión PDO MySQL y constantes JWT
│   ├── helpers/
│   │   ├── jwt.php               # Codificación/decodificación JWT HS256 (exp)
│   │   └── response.php          # CORS, jsonResponse(), requireAuth(), requireRole()
│   ├── database.sql              # Esquema relacional y datos semilla
│   └── index.php                 # Router REST y controladores (/api/*)
├── docs/
│   └── entregable-final.md       # Documento base del entregable final (exportable a PDF)
├── frontend/
│   └── src/
│       ├── environments/
│       │   └── environment.ts    # apiUrl: http://localhost:8000/api
│       └── app/
│           ├── app.config.ts     # provideRouter + provideHttpClient(withInterceptors(...))
│           ├── app.routes.ts     # Rutas principales, lazy loading, layout y wildcard 404
│           ├── core/
│           │   ├── guards/       # authGuard, loginGuard, roleGuard
│           │   ├── interceptors/ # authInterceptor, errorInterceptor
│           │   ├── models/       # Interfaces TypeScript (Auth, Course, User, Enrollment, Report)
│           │   └── services/     # AuthService, CourseService, UserService, ReportService
│           ├── features/
│           │   ├── auth/         # LoginComponent
│           │   ├── dashboard/    # DashboardComponent
│           │   ├── courses/      # CourseListComponent, CourseFormDialogComponent, CourseHistoryComponent
│           │   ├── users/        # UserListComponent, UserFormDialogComponent
│           │   └── reports/      # ReportsComponent
│           └── shared/
│               ├── components/   # MainLayoutComponent, ConfirmDialogComponent, UnauthorizedComponent, NotFoundComponent
│               ├── directives/   # HasRoleDirective (*appHasRole), HighlightStatusDirective ([appHighlightStatus])
│               └── pipes/        # CourseStatusPipe (courseStatus), RoleLabelPipe (roleLabel)
└── README.md
```

---

## Puntos Clave de la Rúbrica Implementados

- **Lazy Loading por feature**: `auth.routes.ts`, `dashboard.routes.ts`, `courses.routes.ts`, `users.routes.ts` y `reports.routes.ts` cargados bajo demanda mediante `loadChildren`.
- **3 Functional Guards (`CanActivateFn`)**:
  - `authGuard`: protege las rutas internas bajo `MainLayoutComponent` redirigiendo a `/login` si no hay sesión válida.
  - `loginGuard`: evita que un usuario autenticado vuelva a `/login`, redirigiéndolo a `/dashboard`.
  - `roleGuard`: valida los roles declarados en `route.data['roles']` y redirige a `/unauthorized` si el rol no tiene permiso.
- **2 Interceptores HTTP Funcionales (`HttpInterceptorFn`)**:
  - `authInterceptor`: valida expiración del JWT antes de enviar la petición y adjunta `Authorization: Bearer <token>`.
  - `errorInterceptor`: intercepta respuestas `401` (cierra sesión y notifica), `403` (redirige a `/unauthorized`) y otros errores HTTP mediante `MatSnackBar`.
- **Pipes Personalizados**:
  - `CourseStatusPipe` (`courseStatus`): traduce `'active' | 'draft' | 'inactive'` a `'Activo' | 'Borrador' | 'Inactivo'`.
  - `RoleLabelPipe` (`roleLabel`): traduce `'admin' | 'profesor' | 'estudiante'` a `'Administrador' | 'Profesor' | 'Estudiante'`.
- **Directivas Personalizadas**:
  - `HasRoleDirective` (`*appHasRole`): directiva estructural reactiva a `AuthService.currentUser$` para mostrar u ocultar elementos según rol.
  - `HighlightStatusDirective` (`[appHighlightStatus]`): directiva de atributo que aplica estilos tipo badge según el estado del curso.
- **Formularios Reactivos Avanzados**:
  - `CourseFormDialogComponent`: uso de `FormArray` dinámico para módulos del curso y validador asíncrono de código único (`GET /api/courses/check-code`).
  - `UserFormDialogComponent`: validador asíncrono de correo único (`GET /api/users/check-email`) y contraseña condicional en creación/edición.
