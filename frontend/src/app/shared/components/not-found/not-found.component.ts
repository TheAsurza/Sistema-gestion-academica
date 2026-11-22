import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="error-page">
      <mat-card class="error-card">
        <mat-icon class="error-icon" color="primary">search_off</mat-icon>
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Página no encontrada</h2>
        <p class="error-message">
          La ruta que intentas visitar no existe o fue movida.
        </p>
        <a mat-flat-button color="primary" routerLink="/">
          Volver al inicio
        </a>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .error-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: var(--zegel-bg);
      }

      .error-card {
        max-width: 420px;
        width: 100%;
        padding: 36px 28px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .error-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--zegel-primary);
      }

      .error-code {
        margin: 0;
        font-size: 56px;
        font-weight: 700;
        line-height: 1;
        color: var(--zegel-primary);
      }

      .error-title {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }

      .error-message {
        margin: 0 0 8px;
        color: var(--zegel-muted);
      }
    `,
  ],
})
export class NotFoundComponent {}
