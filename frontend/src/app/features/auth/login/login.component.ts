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
    <div class="login-outer px-3 px-md-5 py-4 d-flex align-items-center justify-content-center">
      <div class="login-stage w-100 d-flex align-items-center justify-content-between gap-4">
        <!-- Left Mirrored Illustration (no overlap) -->
        <div class="illustration-col d-none d-lg-flex align-items-center justify-content-center">
          <img
            src="/images/login-illustration.jpg"
            alt="Ilustración Portal Zegel"
            class="login-illustration"
          />
        </div>

        <!-- Right Login Frame -->
        <div class="login-frame-wrap d-flex justify-content-center justify-content-lg-end">
          <div class="login-frame row g-0 overflow-hidden">
        <!-- Left Violet Accent Panel -->
        <div class="col-lg-6 violet-hero-panel p-4 p-md-5 d-flex flex-column justify-content-center">
          <div>
            <div class="d-flex align-items-center gap-3 mb-4">
              <div class="brand-tile">
                <i class="bi bi-mortarboard-fill"></i>
              </div>
              <div>
                <h1 class="h3 fw-bold mb-0 text-white">Portal Zegel</h1>
                <p class="small mb-0 text-white-50">Escuela de Tecnología</p>
              </div>
            </div>

            <h2 class="display-6 fw-bold text-white mb-0 lh-sm">
              Todo tu sistema académico en un solo lugar.
            </h2>
          </div>
        </div>

        <!-- Right Clean White Form Panel -->
        <div class="col-lg-6 bg-white p-4 p-md-5 d-flex align-items-center">
          <div class="w-100 mx-auto" style="max-width: 390px;">
            <div class="mb-4">
              <h2 class="h3 fw-bold mb-1">Bienvenido de nuevo</h2>
              <p class="text-muted small mb-0">
                Ingresa tus credenciales para acceder a tu panel.
              </p>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="d-flex flex-column gap-3">
              <div>
                <label for="login-email" class="form-label small fw-semibold">Correo electrónico</label>
                <div class="input-group">
                  <span class="input-group-text bg-light border-end-0">
                    <i class="bi bi-envelope text-muted"></i>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    class="form-control border-start-0"
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
                  <span class="input-group-text bg-light border-end-0">
                    <i class="bi bi-lock text-muted"></i>
                  </span>
                  <input
                    id="login-password"
                    [type]="hidePassword() ? 'password' : 'text'"
                    class="form-control border-start-0 border-end-0"
                    [class.is-invalid]="loginForm.controls.password.invalid && loginForm.controls.password.touched"
                    formControlName="password"
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary border-start-0 bg-light"
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
                class="btn btn-ink py-2 mt-2 d-flex align-items-center justify-content-center gap-2"
                [disabled]="loginForm.invalid || loading()"
              >
                @if (loading()) {
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Ingresando...</span>
                } @else {
                  <span>Iniciar sesión</span>
                  <i class="bi bi-arrow-right"></i>
                }
              </button>
            </form>

            <div class="mt-4 pt-3 border-top text-center">
              <div class="text-muted small mb-2">Accesos rápidos de demostración</div>
              <div class="row g-2">
                @for (cred of demoCredentials; track cred.email) {
                  <div class="col-4">
                    <button
                      type="button"
                      class="btn btn-light btn-sm w-100 border d-flex align-items-center justify-content-center gap-1"
                      (click)="fillCredentials(cred)"
                      [disabled]="loading()"
                    >
                      <i class="bi text-primary" [class]="cred.icon"></i>
                      <span>{{ cred.label }}</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-outer {
        min-height: 100vh;
        background-color: #ffffff;
      }

      .login-stage {
        max-width: 1380px;
      }

      .illustration-col {
        flex: 0 0 38%;
        max-width: 500px;
      }

      .login-illustration {
        width: 100%;
        max-height: 80vh;
        object-fit: contain;
        transform: scaleX(-1);
        user-select: none;
        pointer-events: none;
      }

      .login-frame-wrap {
        flex: 1 1 auto;
      }

      .login-frame {
        width: 100%;
        max-width: 820px;
        border-radius: 28px;
        background: #ffffff;
        box-shadow: 0 24px 64px rgba(20, 21, 38, 0.12);
      }

      .violet-hero-panel {
        background: linear-gradient(155deg, #6c63ff 0%, #5349e6 100%);
        min-height: 480px;
      }

      .brand-tile {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
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
