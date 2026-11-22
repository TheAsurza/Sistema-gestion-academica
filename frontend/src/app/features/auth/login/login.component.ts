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
  icon: string;
  email: string;
  password: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  { label: 'Admin', icon: 'admin_panel_settings', email: 'admin@zegel.edu.pe', password: 'password' },
  { label: 'Profesor', icon: 'co_present', email: 'carlos.mendoza@zegel.edu.pe', password: 'password' },
  { label: 'Estudiante', icon: 'school', email: 'anthony.quispe@zegel.edu.pe', password: 'password' },
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
    <div class="login-shell">
      <section class="hero-panel">
        <div class="hero-content">
          <div class="hero-brand">
            <div class="hero-logo">
              <mat-icon>school</mat-icon>
            </div>
            <div>
              <span class="hero-kicker">Zegel · Escuela de Tecnología</span>
              <h1>Zegel LMS</h1>
            </div>
          </div>

          <p class="hero-lead">
            Plataforma centralizada para la gestión académica de cursos, usuarios y seguimiento de notas con acceso seguro por roles.
          </p>

          <div class="hero-highlights">
            <div class="highlight-card">
              <mat-icon>admin_panel_settings</mat-icon>
              <div>
                <strong>Administrador</strong>
                <span>CRUD completo de cursos, usuarios y reportes</span>
              </div>
            </div>
            <div class="highlight-card">
              <mat-icon>co_present</mat-icon>
              <div>
                <strong>Profesor</strong>
                <span>Gestión de temarios en sus cursos asignados</span>
              </div>
            </div>
            <div class="highlight-card">
              <mat-icon>school</mat-icon>
              <div>
                <strong>Estudiante</strong>
                <span>Cursos activos e historial académico por ciclo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="form-panel">
        <mat-card class="login-card">
          <div class="card-top">
            <span class="welcome-pill">Acceso JWT Seguro</span>
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales institucionales para continuar.</p>
          </div>

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
                <span>Ingresar al sistema</span>
                <mat-icon>arrow_forward</mat-icon>
              }
            </button>
          </form>

          <div class="demo-section">
            <span class="demo-title">Accesos rápidos de demostración</span>
            <div class="demo-buttons">
              @for (cred of demoCredentials; track cred.email) {
                <button
                  mat-stroked-button
                  type="button"
                  class="demo-chip"
                  (click)="fillCredentials(cred)"
                  [disabled]="loading()"
                >
                  <mat-icon>{{ cred.icon }}</mat-icon>
                  <span>{{ cred.label }}</span>
                </button>
              }
            </div>
          </div>
        </mat-card>
      </section>
    </div>
  `,
  styles: [
    `
      .login-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        background: var(--zegel-bg);
      }

      .hero-panel {
        background: radial-gradient(circle at top right, #3b82f6 0%, #1d4ed8 45%, #0f172a 100%);
        color: #ffffff;
        padding: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-content {
        max-width: 460px;
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      .hero-brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .hero-logo {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-logo mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
      }

      .hero-kicker {
        display: block;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #bfdbfe;
      }

      .hero-brand h1 {
        margin: 2px 0 0;
        font-size: 30px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .hero-lead {
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        color: #e2e8f0;
      }

      .hero-highlights {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .highlight-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.16);
      }

      .highlight-card mat-icon {
        color: #93c5fd;
        flex-shrink: 0;
      }

      .highlight-card strong {
        display: block;
        font-size: 14px;
        font-weight: 600;
      }

      .highlight-card span {
        display: block;
        font-size: 12px;
        color: #cbd5e1;
      }

      .form-panel {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 24px;
      }

      .login-card {
        width: 100%;
        max-width: 440px;
        padding: 32px !important;
      }

      .card-top {
        margin-bottom: 24px;
      }

      .welcome-pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 9999px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 10px;
      }

      .card-top h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--zegel-text);
      }

      .card-top p {
        margin: 6px 0 0;
        font-size: 14px;
        color: var(--zegel-muted);
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
        border-radius: 10px;
        background: var(--zegel-error-soft);
        border: 1px solid #fecaca;
        color: var(--zegel-error);
        font-size: 13px;
      }

      .submit-btn {
        height: 46px;
        border-radius: 10px !important;
        font-weight: 600 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 4px;
      }

      .demo-section {
        margin-top: 24px;
        padding-top: 18px;
        border-top: 1px solid var(--zegel-border);
        text-align: center;
      }

      .demo-title {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--zegel-muted);
        margin-bottom: 12px;
      }

      .demo-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .demo-chip {
        border-radius: 10px !important;
        border-color: var(--zegel-border) !important;
        font-size: 12px !important;
        height: 38px;
      }

      @media (max-width: 900px) {
        .login-shell {
          grid-template-columns: 1fr;
        }

        .hero-panel {
          padding: 32px 24px;
        }

        .hero-highlights {
          display: none;
        }

        .demo-buttons {
          grid-template-columns: 1fr;
        }
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
      error: (err: { status?: number; error?: { error?: string; message?: string } }) => {
        this.loading.set(false);
        const backendMessage = err.error?.error ?? err.error?.message;
        if (err.status === 401) {
          this.errorMessage.set(
            backendMessage ?? 'Credenciales incorrectas. Verifica tu correo y contraseña.',
          );
        } else {
          this.errorMessage.set(
            backendMessage ?? 'No se pudo iniciar sesión. Intenta nuevamente.',
          );
        }
      },
    });
  }
}
