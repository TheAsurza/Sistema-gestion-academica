# Short Design: Migración a Bootstrap 5 + Bootstrap Icons (Glassmorphism)

**Fecha:** 2026-11-22  
**Alcance:** Reemplazar `@angular/material` por **Bootstrap 5 + Bootstrap Icons** con estética **Glassmorphism** en `frontend/`, manteniendo intactos el backend PHP/MariaDB, los contratos REST, servicios, interceptors, guards, rutas lazy, pipes y directivas.

## Enfoque Elegido
- **Opción A (Aprobada):** `bootstrap` + `bootstrap-icons` + servicios/componentes Angular Standalone propios para **Toasts** (`ToastService` + `ToastContainerComponent` en `app.html`) y **Modales** (`ConfirmDialogComponent`, `CourseDetailDialogComponent`, `CourseFormDialogComponent`, `UserFormDialogComponent` con overlay/modal Bootstrap controlado por estado).
- **Descartado:** `@ng-bootstrap/ng-bootstrap` (dependencia extra innecesaria con Angular 22).

## Arquitectura Visual (Glassmorphism sobre Bootstrap 5)
- **Tokens (`styles.scss`):** Fondo atmosférico con degradado en tonos azul/índigo/cian, tarjetas y modales translúcidos (`rgba(255, 255, 255, 0.72)` + `backdrop-filter: blur(16px)` + borde `1px solid rgba(255, 255, 255, 0.65)`), sidebar oscura translúcida (`rgba(15, 23, 42, 0.9)`), tipografía `Plus Jakarta Sans` y foco `:focus-visible` de `3px`.
- **Mapeo de reemplazos:**
  - `MatSnackBar` (`errorInterceptor`, `CourseListComponent`, `UserListComponent`) → `ToastService` (Bootstrap Toast stack).
  - `MatDialog` (`ConfirmDialog`, `CourseDetail`, `CourseForm`, `UserForm`) → Modales Bootstrap controlados con Signals/inputs-outputs o `ModalService` ligero.
  - `MatSidenav` / `MatToolbar` (`MainLayoutComponent`) → Sidebar responsiva + offcanvas móvil Bootstrap + navbar glass.
  - `MatTable`, `MatCard`, `MatFormField`, `MatButton`, `MatIcon` → Clases Bootstrap 5 (`table`, `card`, `form-control`, `form-select`, `btn`, `badge`) + `<i class="bi bi-..."></i>`.
- **Documentación:** Actualizar `README.md` y `docs/entregable-final.md` para reflejar Bootstrap 5 + Bootstrap Icons en lugar de Angular Material.
