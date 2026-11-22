import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface DemoCredential {
  label: string;
  email: string;
  password: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  { label: 'Admin', email: 'admin@zegel.edu.pe', password: 'Zegel2026!' },
  { label: 'Profesor', email: 'profesor@zegel.edu.pe', password: 'Zegel2026!' },
  { label: 'Estudiante', email: 'estudiante@zegel.edu.pe', password: 'Zegel2026!' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header class="login-header">
          <div class="brand-badge">
            <mat-icon>school</mat-icon>
          </div>
          <mat-card-title>Zegel LMS</mat-card-title>
          <mat-card-subtitle>Plataforma de Gestión Académica</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Correo electrónico</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                placeholder="usuario@zegel.edu.pe"
                autocomplete="email"
              />
              <mat-icon matPrefix>email</mat-icon>
              @if (loginForm.controls.email.hasError('required') && loginForm.controls.email.touched) {
                <mat-error>El correo electrónico es obligatorio.</mat-error>
              } @else if (loginForm.controls.email.hasError('email') && loginForm.controls.email.touched) {
                <mat-error>Ingresa un correo electrónico válido.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                autocomplete="current-password"
              />
              <mat-icon matPrefix>lock</mat-icon>
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="hidePassword() ? 'Mostrar contraseña' : 'Ocultar contraseña'"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.controls.password.hasError('required') && loginForm.controls.password.touched) {
                <mat-error>La contraseña es obligatoria.</mat-error>
              } @else if (loginForm.controls.password.hasError('minlength') && loginForm.controls.password.touched) {
                <mat-error>Debe tener al menos 6 caracteres.</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <button
              mat-flat-button
              color="primary"
              type="submit"
              class="submit-btn"
              [disabled]="loginForm.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
                <span>Ingresando...</span>
              } @else {
                <span>Iniciar sesión</span>
              }
            </button>
          </form>

          <div class="demo-section">
            <span class="demo-title">Accesos rápidos de demostración:</span>
            <div class="demo-buttons">
              @for (cred of demoCredentials; track cred.email) {
                <button
                  mat-stroked-button
                  type="button"
                  (click)="fillCredentials(cred)"
                  [disabled]="loading()"
                >
                  {{ cred.label }}
                </button>
              }
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(135deg, #e3f2fd 0%, #f5f7fa 100%);
      }

      .login-card {
        width: 100%;
        max-width: 420px;
        padding: 16px;
      }

      .login-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 20px;
      }

      .brand-badge {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: #1565c0;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
      }

      .brand-badge mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .full-width {
        width: 100%;
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 8px;
        background: #ffebee;
        color: #c62828;
        font-size: 13px;
      }

      .submit-btn {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 4px;
      }

      .demo-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
        text-align: center;
      }

      .demo-title {
        display: block;
        font-size: 12px;
        color: #616161;
        margin-bottom: 10px;
      }

      .demo-buttons {
        display: flex;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly demoCredentials = DEMO_CREDENTIALS;
  readonly hidePassword = signal(true);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePasswordVisibility(): void {
    this.hidePassword.update((v) => !v);
  }

  fillCredentials(cred: DemoCredential): void {
    this.errorMessage.set(null);
    this.loginForm.patchValue({
      email: cred.email,
      password: cred.password,
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.loading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();
    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Credenciales incorrectas. Verifica tu correo y contraseña.');
        } else {
          this.errorMessage.set(
            err.error?.message ?? 'No se pudo iniciar sesión. Intenta nuevamente.',
          );
        }
      },
    });
  }
}
