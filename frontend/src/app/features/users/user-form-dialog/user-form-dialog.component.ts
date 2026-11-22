import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';
import { User, UserPayload, UserRole } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';

export interface UserFormDialogData {
  user?: User;
}

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="name" placeholder="Ej. Ana García" />
          @if (form.controls.name.hasError('required') && form.controls.name.touched) {
            <mat-error>El nombre es obligatorio.</mat-error>
          } @else if (form.controls.name.hasError('minlength') && form.controls.name.touched) {
            <mat-error>Mínimo 3 caracteres.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Correo electrónico</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            placeholder="usuario@zegel.edu.pe"
          />
          @if (form.controls.email.pending) {
            <mat-spinner matSuffix diameter="18"></mat-spinner>
          }
          @if (form.controls.email.hasError('required') && form.controls.email.touched) {
            <mat-error>El correo electrónico es obligatorio.</mat-error>
          } @else if (form.controls.email.hasError('email') && form.controls.email.touched) {
            <mat-error>Ingresa un correo electrónico válido.</mat-error>
          } @else if (form.controls.email.hasError('emailTaken')) {
            <mat-error>Este correo electrónico ya está registrado.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="role">
            <mat-option value="admin">Administrador</mat-option>
            <mat-option value="profesor">Profesor</mat-option>
            <mat-option value="estudiante">Estudiante</mat-option>
          </mat-select>
          @if (form.controls.role.hasError('required') && form.controls.role.touched) {
            <mat-error>El rol es obligatorio.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</mat-label>
          <input
            matInput
            [type]="hidePassword() ? 'password' : 'text'"
            formControlName="password"
            [placeholder]="isEdit ? 'Dejar en blanco para mantener la actual' : 'Mínimo 6 caracteres'"
          />
          <button
            mat-icon-button
            matSuffix
            type="button"
            [attr.aria-label]="hidePassword() ? 'Mostrar contraseña' : 'Ocultar contraseña'"
            (click)="hidePassword.set(!hidePassword())"
          >
            <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (form.controls.password.hasError('required') && form.controls.password.touched) {
            <mat-error>La contraseña es obligatoria.</mat-error>
          } @else if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
            <mat-error>Mínimo 6 caracteres.</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || form.pending"
        >
          {{ isEdit ? 'Guardar cambios' : 'Crear usuario' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 440px;
        max-width: 100%;
        padding-top: 8px;
      }

      .full-width {
        width: 100%;
      }

      @media (max-width: 540px) {
        .dialog-content {
          min-width: auto;
        }
      }
    `,
  ],
})
export class UserFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(
    MatDialogRef<UserFormDialogComponent, UserPayload | undefined>,
  );
  readonly data = inject<UserFormDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  readonly isEdit = !!this.data?.user;
  readonly hidePassword = signal(true);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.user?.name ?? '', [Validators.required, Validators.minLength(3)]],
    email: [
      this.data?.user?.email ?? '',
      [Validators.required, Validators.email],
      [this.emailAvailableValidator()],
    ],
    role: [this.data?.user?.role ?? ('estudiante' as UserRole), [Validators.required]],
    password: [
      '',
      this.isEdit
        ? [Validators.minLength(6)]
        : [Validators.required, Validators.minLength(6)],
    ],
  });

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSubmit(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UserPayload = {
      name: raw.name.trim(),
      email: raw.email.trim(),
      role: raw.role,
    };

    if (!this.isEdit || raw.password.trim().length > 0) {
      payload.password = raw.password;
    }

    this.dialogRef.close(payload);
  }

  private emailAvailableValidator(): AsyncValidatorFn {
    const initialEmail = this.data?.user?.email?.trim().toLowerCase() ?? '';
    const excludeId = this.data?.user?.id;

    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = String(control.value ?? '').trim();
      if (!value || Validators.email(control) !== null) {
        return of(null);
      }

      if (this.isEdit && value.toLowerCase() === initialEmail) {
        return of(null);
      }

      return timer(300).pipe(
        switchMap(() => this.userService.checkEmailAvailable(value, excludeId)),
        map((available) => (available ? null : { emailTaken: true })),
        catchError(() => of(null)),
      );
    };
  }
}
