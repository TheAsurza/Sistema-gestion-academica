# Zegel — Plataforma de Gestión Académica (Desarrollo de Interfaces III)

Aplicación web **SPA (Single Page Application)** desarrollada con **Angular 22 Standalone + Bootstrap 5** y un backend **API REST modular en PHP 8+ (PDO / MySQL)** con autenticación **JWT (HS256)** y control de acceso basado en roles (**RBAC**: `admin`, `profesor`, `estudiante`).

---

## Tecnologías Utilizadas

- **Frontend (`frontend/`)**: Angular 22 Standalone, TypeScript, Bootstrap 5, Bootstrap Icons y RxJS (`HttpClient`, rutas lazy-loaded, 3 guards funcionales, 2 interceptores HTTP funcionales, formularios reactivos con `FormArray` y validadores asíncronos, pipes y directivas personalizadas).
- **Backend (`backend/`)**: PHP 8.1+ (sin frameworks externos), PDO para MySQL (`zegel_cursos_db`), JWT firmado con HMAC-SHA256 (`HS256`, vigencia de `3600` segundos), cabeceras CORS y controladores modulares en `backend/controllers/`.
- **Base de datos**: MySQL 8+ / MariaDB (`backend/database.sql`).

---

## Prerrequisitos

- **Node.js** (v20+ recomendado) y **npm**
- **PHP 8.1+** con extensión `pdo_mysql` habilitada
- **MySQL 8+ / MariaDB** (o paquete **XAMPP** / Laragon)

---

## Instalación y Ejecución Paso a Paso

### 1. Importar la base de datos MySQL

Ejecutar el script `backend/database.sql` desde MySQL Workbench, phpMyAdmin o terminal. Este script crea la base de datos `zegel_cursos_db`, las 8 tablas (`users`, `courses`, `course_modules`, `enrollments`, `agenda_events`, `attendance_stats`, `notices`, `course_attendance`) y los datos semilla:

```bash
mysql -u root -p < backend/database.sql
```

### 2. Configurar credenciales de MySQL en el Backend

Revisar `backend/config/database.php`. Por defecto se conecta a `127.0.0.1:3306` (`zegel_cursos_db`, usuario `root`). Si tu servidor MySQL tiene otra contraseña (por ejemplo vacía `''` en XAMPP), ajústala en `backend/config/database.php` o define la variable de entorno `DB_PASS` antes de iniciar PHP:

```powershell
# Ejemplo en PowerShell (si tu MySQL no tiene contraseña)
$env:DB_PASS=""
```

### 3. Iniciar el Backend (PHP)

Desde la **raíz del proyecto**, iniciar el servidor embebido de PHP apuntando a `backend/`:

```bash
php -S localhost:8000 -t backend
```

La API quedará disponible en `http://localhost:8000/api`.

### 4. Instalar dependencias e iniciar el Frontend (Angular)

En otra terminal, dentro de `frontend/`:

```bash
cd frontend
npm install
npm start
```

Abrir en el navegador: **http://localhost:4200**

---

## Credenciales de Prueba

Todos los usuarios semilla de `backend/database.sql` tienen la contraseña **`password`** (almacenada con `bcrypt`):

| Rol | Código | Nombre | Correo electrónico | Contraseña |
| :--- | :--- | :--- | :--- | :--- |
| `admin` | `ADM-2026-0001` | Administrador Zegel | `admin@zegel.edu.pe` | `password` |
| `profesor` | `DOC-2026-0001` | Prof. Carlos Mendoza | `carlos.mendoza@zegel.edu.pe` | `password` |
| `profesor` | `DOC-2026-0002` | Prof. Lucía Paredes | `lucia.paredes@zegel.edu.pe` | `password` |
| `estudiante` | `ALU-2026-0001` | Anthony Quispe | `anthony.quispe@zegel.edu.pe` | `password` |

---

## Estructura del Proyecto

```text
.
├── backend/
│   ├── config/
│   │   └── database.php              # Conexión PDO MySQL y constantes JWT
│   ├── controllers/
│   │   ├── auth.php                  # Login y emisión de JWT
│   │   ├── courses.php               # CRUD de cursos, módulos, vista docente y vista alumno
│   │   ├── users.php                 # Profesores, alumnos, administrativos y código único
│   │   ├── enrollments.php           # Matrículas, retiros, historial y notas
│   │   ├── attendance.php            # Asistencia semanal y por sesión de curso
│   │   ├── reports.php               # Reportes académicos (admin y docente)
│   │   └── dashboard.php             # Agenda y avisos institucionales
│   ├── helpers/
│   │   ├── jwt.php                   # Codificación y validación JWT HS256
│   │   └── response.php              # CORS, jsonResponse(), requireAuth(), requireRole()
│   ├── database.sql                  # Esquema relacional (8 tablas) y datos semilla
│   └── index.php                     # Enrutador REST (/api/*)
├── frontend/
│   └── src/
│       ├── environments/
│       │   └── environment.ts        # apiUrl: http://localhost:8000/api
│       └── app/
│           ├── app.config.ts         # provideRouter + provideHttpClient(withInterceptors(...))
│           ├── app.routes.ts         # Rutas lazy-loaded, layout protegido y 404
│           └── core/
│               ├── guards/           # authGuard, loginGuard, roleGuard
│               ├── interceptors/     # authInterceptor, errorInterceptor
│               ├── models/           # Interfaces TypeScript
│               └── services/         # AuthService, CourseService, UserService, ReportService, DashboardWidgetService, ToastService
│           ├── features/
│           │   ├── auth/             # LoginComponent
│           │   ├── dashboard/        # DashboardComponent (adaptado por rol)
│           │   ├── courses/          # CourseListComponent, CourseFormDialogComponent, CourseDetailComponent, StudentCourseViewComponent, CourseHistoryComponent
│           │   ├── teachers/         # TeacherListComponent
│           │   ├── students/         # StudentListComponent (incluye matrícula/retiro de cursos)
│           │   ├── staff/            # StaffListComponent
│           │   ├── agenda/           # TeacherAgendaComponent (gestión docente / lectura alumno)
│           │   └── reports/          # ReportsComponent (admin y docente, exportación CSV/PDF)
│           └── shared/
│               ├── components/       # MainLayoutComponent, ConfirmDialogComponent, ToastContainerComponent, UnauthorizedComponent, NotFoundComponent
│               ├── directives/       # HasRoleDirective (*appHasRole), HighlightStatusDirective ([appHighlightStatus])
│               └── pipes/            # CourseStatusPipe (courseStatus), RoleLabelPipe (roleLabel)
└── README.md
```

---

## Cumplimiento de la Rúbrica

- **Rutas y Lazy Loading**: módulos cargados bajo demanda (`auth`, `dashboard`, `courses`, `teachers`, `students`, `staff`, `agenda`, `reports`), rutas parametrizadas (`/courses/:id`, `/courses/:id/view`), redirecciones y ruta comodín `404` (`NotFoundComponent`).
- **Guards (`CanActivateFn`)**: `authGuard`, `loginGuard` y `roleGuard` con redirección a `/login`, `/dashboard` o `/unauthorized` según sesión y rol.
- **Interceptores (`HttpInterceptorFn`)**: `authInterceptor` (verifica expiración e inserta `Authorization: Bearer <token>`) y `errorInterceptor` (manejo global de `401`, `403` y errores HTTP con `ToastService`).
- **API REST con `HttpClient`**: operaciones `GET`, `POST`, `PUT` y `DELETE` separadas por entidad con `Observables` y `catchError`.
- **Pipes y Directivas personalizadas**: `courseStatus`, `roleLabel`, `*appHasRole` y `[appHighlightStatus]`.
