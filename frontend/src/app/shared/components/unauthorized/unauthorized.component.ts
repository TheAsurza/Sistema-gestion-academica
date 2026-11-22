import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <div class="glass-card text-center p-4 p-md-5 error-card">
        <div class="error-icon-wrap mb-3 mx-auto">
          <i class="bi bi-shield-lock-fill"></i>
        </div>
        <h1 class="display-4 fw-bold mb-1 error-code">403</h1>
        <h2 class="h4 fw-semibold mb-2">Acceso no autorizado</h2>
        <p class="text-muted mb-4">
          No cuentas con los permisos necesarios para acceder a esta sección.
        </p>
        <a class="btn btn-primary px-4" routerLink="/dashboard">
          <i class="bi bi-arrow-left me-2"></i>Volver al Dashboard
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .error-card {
        max-width: 430px;
        width: 100%;
      }

      .error-icon-wrap {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        background: var(--zegel-error-soft);
        color: var(--zegel-error);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
      }

      .error-code {
        color: var(--zegel-error);
      }
    `,
  ],
})
export class UnauthorizedComponent {}
