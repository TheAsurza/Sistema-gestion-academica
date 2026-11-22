import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';
import { User, UserPayload, UserRole } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="glass-modal-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="isEdit ? 'Editar Usuario' : 'Nuevo Usuario'"
      (click)="cancelled.emit()"
    >
      <div class="glass-modal user-modal p-4" (click)="$event.stopPropagation()">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">{{ isEdit ? 'Editar Usuario' : 'Nuevo Usuario' }}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Cerrar"
            (click)="cancelled.emit()"
          ></button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSave()" class="d-flex flex-column gap-3">
          <div>
            <label class="form-label small fw-semibold">Nombre completo</label>
            <input
              type="text"
              class="form-control"
              [class.is-invalid]="form.controls.name.invalid && form.controls.name.touched"
              formControlName="name"
              placeholder="Ej. María Torres"
            />
            @if (form.controls.name.hasError('required') && form.controls.name.touched) {
              <div class="text-danger small mt-1">El nombre es obligatorio.</div>
            } @else if (form.controls.name.hasError('minlength') && form.controls.name.touched) {
              <div class="text-danger small mt-1">Mínimo 3 caracteres.</div>
            }
          </div>

          <div>
            <label class="form-label small fw-semibold">Correo electrónico</label>
            <input
              type="email"
              class="form-control"
              [class.is-invalid]="form.controls.email.invalid && form.controls.email.touched"
              formControlName="email"
              placeholder="usuario@zegel.edu.pe"
            />
            @if (form.controls.email.pending) {
              <div class="form-text text-primary">Verificando disponibilidad...</div>
            } @else if (form.controls.email.hasError('required') && form.controls.email.touched) {
              <div class="text-danger small mt-1">El correo es obligatorio.</div>
            } @else if (form.controls.email.hasError('email') && form.controls.email.touched) {
              <div class="text-danger small mt-1">Ingresa un correo válido.</div>
            } @else if (form.controls.email.hasError('emailTaken')) {
              <div class="text-danger small mt-1">Este correo ya está registrado.</div>
            }
          </div>

          <div>
            <label class="form-label small fw-semibold">Rol</label>
            <select class="form-select" formControlName="role">
              <option value="admin">Administrador</option>
              <option value="profesor">Profesor</option>
              <option value="estudiante">Estudiante</option>
            </select>
          </div>

          <div>
            <label class="form-label small fw-semibold">
              {{ isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña' }}
            </label>
            <input
              type="password"
              class="form-control"
              [class.is-invalid]="form.controls.password.invalid && form.controls.password.touched"
              formControlName="password"
              autocomplete="new-password"
            />
            @if (isEdit) {
              <div class="form-text">Déjalo vacío para mantener la contraseña actual.</div>
            }
            @if (form.controls.password.hasError('required') && form.controls.password.touched) {
              <div class="text-danger small mt-1">La contraseña es obligatoria.</div>
            } @else if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
              <div class="text-danger small mt-1">Mínimo 6 caracteres.</div>
            }
          </div>

          <div class="d-flex justify-content-end gap-2 pt-2 border-top">
            <button type="button" class="btn btn-outline-secondary" (click)="cancelled.emit()">
              Cancelar
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="form.invalid || form.pending"
            >
              {{ isEdit ? 'Guardar cambios' : 'Crear usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .user-modal {
        max-width: 480px;
      }
    `,
  ],
})
export class UserFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  @Input() user: User | null = null;
  @Output() saved = new EventEmitter<UserPayload>();
  @Output() cancelled = new EventEmitter<void>();

  isEdit = false;
  private originalEmail = '';

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: [
      '',
      [Validators.required, Validators.email],
      [this.emailAvailableValidator()],
    ],
    role: ['estudiante' as UserRole, [Validators.required]],
    password: [''],
  });

  ngOnInit(): void {
    this.isEdit = !!this.user;
    this.originalEmail = this.user?.email?.trim().toLowerCase() ?? '';

    const passwordCtrl = this.form.controls.password;
    if (this.isEdit) {
      passwordCtrl.setValidators([Validators.minLength(6)]);
    } else {
      passwordCtrl.setValidators([Validators.required, Validators.minLength(6)]);
    }
    passwordCtrl.updateValueAndValidity();

    if (this.user) {
      this.form.patchValue({
        name: this.user.name,
        email: this.user.email,
        role: this.user.role,
        password: '',
      });
    }
  }

  onSave(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UserPayload = {
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      role: raw.role,
    };

    const password = raw.password.trim();
    if (password.length > 0) {
      payload.password = password;
    }

    this.saved.emit(payload);
  }

  private emailAvailableValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = String(control.value ?? '').trim().toLowerCase();
      if (!value || control.hasError('email')) {
        return of(null);
      }
      if (this.isEdit && value === this.originalEmail) {
        return of(null);
      }

      return timer(300).pipe(
        switchMap(() => this.userService.checkEmailAvailable(value, this.user?.id)),
        map((available) => (available ? null : { emailTaken: true })),
        catchError(() => of(null)),
      );
    };
  }
}
