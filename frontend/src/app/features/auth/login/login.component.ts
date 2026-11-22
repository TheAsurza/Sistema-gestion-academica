import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface DemoCredential {
  label: string;
  icon: string;
  email: string;
  password: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  { label: 'Admin', icon: 'bi-shield-check', email: 'admin@zegel.edu.pe', password: 'password' },
  { label: 'Profesor', icon: 'bi-person-workspace', email: 'carlos.mendoza@zegel.edu.pe', password: 'password' },
  { label: 'Estudiante', icon: 'bi-mortarboard', email: 'anthony.quispe@zegel.edu.pe', password: 'password' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-shell">
      <section class="hero-panel">
        <div class="hero-content">
          <div class="d-flex align-items-center gap-3">
            <div class="hero-logo">
              <i class="bi bi-mortarboard-fill"></i>
            </div>
            <div>
              <h1 class="h2 fw-bold mb-0 text-white">Zegel LMS</h1>
              <p class="small mb-0 text-white-50">Escuela de Tecnología</p>
            </div>
          </div>

          <p class="hero-lead mb-0">
            Plataforma centralizada para la gestión académica de cursos, usuarios y seguimiento de notas con acceso seguro por roles.
          </p>

          <div class="d-none d-lg-flex flex-column gap-3">
            <div class="highlight-card">
              <i class="bi bi-shield-check fs-4 text-info"></i>
              <div>
                <div class="fw-semibold small text-white">Administrador</div>
                <div class="text-white-50 small">CRUD completo de cursos, usuarios y reportes</div>
              </div>
            </div>
            <div class="highlight-card">
              <i class="bi bi-person-workspace fs-4 text-info"></i>
              <div>
                <div class="fw-semibold small text-white">Profesor</div>
                <div class="text-white-50 small">Gestión de temarios en sus cursos asignados</div>
              </div>
            </div>
            <div class="highlight-card">
              <i class="bi bi-mortarboard fs-4 text-info"></i>
              <div>
                <div class="fw-semibold small text-white">Estudiante</div>
                <div class="text-white-50 small">Cursos activos e historial académico por ciclo</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="form-panel">
        <div class="glass-card login-card p-4 p-md-5">
          <div class="mb-4">
            <span class="welcome-pill">Acceso JWT Seguro</span>
            <h2 class="h4 fw-bold mb-1">Iniciar sesión</h2>
            <p class="text-muted small mb-0">
              Ingresa tus credenciales institucionales para continuar.
            </p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="d-flex flex-column gap-3">
            <div>
              <label for="login-email" class="form-label small fw-semibold">Correo electrónico</label>
              <div class="input-group">
                <span class="input-group-text bg-white bg-opacity-75">
                  <i class="bi bi-envelope text-muted"></i>
                </span>
                <input
                  id="login-email"
                  type="email"
                  class="form-control"
                  [class.is-invalid]="loginForm.controls.email.invalid && loginForm.controls.email.touched"
                  formControlName="email"
                  placeholder="usuario@zegel.edu.pe"
                  autocomplete="email"
                />
              </div>
              @if (loginForm.controls.email.hasError('required') && loginForm.controls.email.touched) {
                <div class="text-danger small mt-1">El correo electrónico es obligatorio.</div>
              } @else if (loginForm.controls.email.hasError('email') && loginForm.controls.email.touched) {
                <div class="text-danger small mt-1">Ingresa un correo electrónico válido.</div>
              }
            </div>

            <div>
              <label for="login-password" class="form-label small fw-semibold">Contraseña</label>
              <div class="input-group">
                <span class="input-group-text bg-white bg-opacity-75">
                  <i class="bi bi-lock text-muted"></i>
                </span>
                <input
                  id="login-password"
                  [type]="hidePassword() ? 'password' : 'text'"
                  class="form-control"
                  [class.is-invalid]="loginForm.controls.password.invalid && loginForm.controls.password.touched"
                  formControlName="password"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary bg-white bg-opacity-75"
                  (click)="togglePasswordVisibility()"
                  [attr.aria-label]="hidePassword() ? 'Mostrar contraseña' : 'Ocultar contraseña'"
                >
                  <i class="bi" [class]="hidePassword() ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
              @if (loginForm.controls.password.hasError('required') && loginForm.controls.password.touched) {
                <div class="text-danger small mt-1">La contraseña es obligatoria.</div>
              } @else if (loginForm.controls.password.hasError('minlength') && loginForm.controls.password.touched) {
                <div class="text-danger small mt-1">Debe tener al menos 6 caracteres.</div>
              }
            </div>

            @if (errorMessage()) {
              <div class="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small mb-0" role="alert">
                <i class="bi bi-exclamation-circle-fill"></i>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <button
              type="submit"
              class="btn btn-primary py-2 mt-1 d-flex align-items-center justify-content-center gap-2"
              [disabled]="loginForm.invalid || loading()"
            >
              @if (loading()) {
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Ingresando...</span>
              } @else {
                <span>Ingresar al sistema</span>
                <i class="bi bi-arrow-right"></i>
              }
            </button>
          </form>

          <div class="demo-section mt-4 pt-3 text-center">
            <div class="text-muted small mb-2">Accesos rápidos de demostración</div>
            <div class="row g-2">
              @for (cred of demoCredentials; track cred.email) {
                <div class="col-4">
                  <button
                    type="button"
                    class="btn btn-outline-primary btn-sm w-100 bg-white bg-opacity-50 d-flex align-items-center justify-content-center gap-1"
                    (click)="fillCredentials(cred)"
                    [disabled]="loading()"
                  >
                    <i class="bi" [class]="cred.icon"></i>
                    <span>{{ cred.label }}</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .login-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
      }

      .hero-panel {
        background: radial-gradient(circle at top right, #3b82f6 0%, #1d4ed8 45%, #0f172a 100%);
        padding: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .hero-content {
        max-width: 460px;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .hero-logo {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.16);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
      }

      .hero-kicker {
        display: block;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #bfdbfe;
      }

      .hero-lead {
        color: #e2e8f0;
        font-size: 0.95rem;
        line-height: 1.6;
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

      .form-panel {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 1.25rem;
      }

      .login-card {
        width: 100%;
        max-width: 440px;
      }

      .welcome-pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 9999px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        border: 1px solid var(--zegel-primary-border);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.65rem;
      }

      .demo-section {
        border-top: 1px solid var(--zegel-border);
      }

      @media (max-width: 991px) {
        .login-shell {
          grid-template-columns: 1fr;
        }

        .hero-panel {
          padding: 2rem 1.5rem;
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
