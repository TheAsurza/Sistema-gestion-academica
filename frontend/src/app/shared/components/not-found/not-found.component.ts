import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <div class="glass-card text-center p-4 p-md-5 error-card">
        <div class="error-icon-wrap mb-3 mx-auto">
          <i class="bi bi-compass"></i>
        </div>
        <h1 class="display-4 fw-bold mb-1 error-code">404</h1>
        <h2 class="h4 fw-semibold mb-2">Página no encontrada</h2>
        <p class="text-muted mb-4">
          La ruta que intentas visitar no existe o fue movida.
        </p>
        <a class="btn btn-primary px-4" routerLink="/">
          <i class="bi bi-house-door me-2"></i>Volver al inicio
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
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
      }

      .error-code {
        color: var(--zegel-primary);
      }
    `,
  ],
})
export class NotFoundComponent {}
