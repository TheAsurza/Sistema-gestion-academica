import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="error-page">
      <mat-card class="error-card">
        <mat-icon class="error-icon" color="warn">lock</mat-icon>
        <h1 class="error-code">403</h1>
        <h2 class="error-title">Acceso no autorizado</h2>
        <p class="error-message">
          No cuentas con los permisos necesarios para acceder a esta sección.
        </p>
        <a mat-flat-button color="primary" routerLink="/dashboard">
          Volver al Dashboard
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
        background: #f5f7fa;
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
      }

      .error-code {
        margin: 0;
        font-size: 56px;
        font-weight: 700;
        line-height: 1;
        color: #c62828;
      }

      .error-title {
        margin: 0;
        font-size: 22px;
        font-weight: 500;
      }

      .error-message {
        margin: 0 0 8px;
        color: #616161;
      }
    `,
  ],
})
export class UnauthorizedComponent {}
