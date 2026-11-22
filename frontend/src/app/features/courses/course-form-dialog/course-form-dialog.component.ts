import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormArray,
  FormBuilder,
  FormGroup,
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
import { Course, CourseModule, CoursePayload, CourseStatus } from '../../../core/models/course.model';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { UserService } from '../../../core/services/user.service';

export interface CourseFormDialogData {
  course?: Course;
}

@Component({
  selector: 'app-course-form-dialog',
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
    <h2 mat-dialog-title>{{ isEdit ? 'Editar Curso' : 'Nuevo Curso' }}</h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <div class="form-row">
          <mat-form-field appearance="outline" class="field-half">
            <mat-label>Código</mat-label>
            <input matInput formControlName="code" placeholder="Ej. ZEG-101" />
            @if (form.controls.code.pending) {
              <mat-spinner matSuffix diameter="18"></mat-spinner>
            }
            @if (form.controls.code.hasError('required') && form.controls.code.touched) {
              <mat-error>El código es obligatorio.</mat-error>
            } @else if (form.controls.code.hasError('minlength') && form.controls.code.touched) {
              <mat-error>Mínimo 3 caracteres.</mat-error>
            } @else if (form.controls.code.hasError('codeTaken')) {
              <mat-error>Este código ya está en uso.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="field-half">
            <mat-label>Créditos</mat-label>
            <input matInput type="number" formControlName="credits" min="1" max="10" />
            @if (form.controls.credits.hasError('required') && form.controls.credits.touched) {
              <mat-error>Los créditos son obligatorios.</mat-error>
            } @else if (form.controls.credits.hasError('min') || form.controls.credits.hasError('max')) {
              <mat-error>Debe estar entre 1 y 10.</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Título del curso</mat-label>
          <input matInput formControlName="title" placeholder="Ej. Desarrollo de Interfaces III" />
          @if (form.controls.title.hasError('required') && form.controls.title.touched) {
            <mat-error>El título es obligatorio.</mat-error>
          } @else if (form.controls.title.hasError('minlength') && form.controls.title.touched) {
            <mat-error>Mínimo 3 caracteres.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="field-half">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="status">
              <mat-option value="active">Activo</mat-option>
              <mat-option value="draft">Borrador</mat-option>
              <mat-option value="inactive">Inactivo</mat-option>
            </mat-select>
          </mat-form-field>

          @if (isAdmin) {
            <mat-form-field appearance="outline" class="field-half">
              <mat-label>Profesor</mat-label>
              <mat-select formControlName="teacher_id">
                <mat-option [value]="null">Sin asignar</mat-option>
                @for (teacher of teachers(); track teacher.id) {
                  <mat-option [value]="teacher.id">{{ teacher.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          } @else {
            <mat-form-field appearance="outline" class="field-half">
              <mat-label>Profesor</mat-label>
              <input matInput [value]="data?.course?.teacher_name || 'Profesor asignado'" disabled />
            </mat-form-field>
          }
        </div>

        <div class="modules-section">
          <div class="modules-header">
            <h3>Módulos ({{ modulesArray.length }})</h3>
            <button mat-stroked-button color="primary" type="button" (click)="addModule()">
              <mat-icon>add</mat-icon>
              Agregar módulo
            </button>
          </div>

          <div formArrayName="modules" class="modules-list">
            @for (moduleGroup of modulesArray.controls; track $index) {
              <div [formGroupName]="$index" class="module-row">
                <mat-form-field appearance="outline" class="module-title">
                  <mat-label>Título del módulo {{ $index + 1 }}</mat-label>
                  <input matInput formControlName="title" />
                  @if (moduleGroup.get('title')?.hasError('required') && moduleGroup.get('title')?.touched) {
                    <mat-error>Requerido.</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="module-hours">
                  <mat-label>Horas</mat-label>
                  <input matInput type="number" formControlName="hours" min="1" />
                  @if (moduleGroup.get('hours')?.hasError('required') && moduleGroup.get('hours')?.touched) {
                    <mat-error>Requerido.</mat-error>
                  } @else if (moduleGroup.get('hours')?.hasError('min')) {
                    <mat-error>Mín. 1</mat-error>
                  }
                </mat-form-field>

                <button
                  mat-icon-button
                  color="warn"
                  type="button"
                  aria-label="Eliminar módulo"
                  (click)="removeModule($index)"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            } @empty {
              <p class="empty-modules">No hay módulos registrados. Agrega al menos uno si lo deseas.</p>
            }
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || form.pending"
        >
          {{ isEdit ? 'Guardar cambios' : 'Crear curso' }}
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
        min-width: 520px;
        max-width: 100%;
        padding-top: 8px;
      }

      .form-row {
        display: flex;
        gap: 12px;
      }

      .field-half {
        flex: 1 1 50%;
      }

      .full-width {
        width: 100%;
      }

      .modules-section {
        border-top: 1px solid #e0e0e0;
        padding-top: 12px;
      }

      .modules-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .modules-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
      }

      .modules-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .module-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .module-title {
        flex: 1 1 auto;
      }

      .module-hours {
        width: 110px;
      }

      .empty-modules {
        color: #757575;
        font-size: 13px;
        margin: 4px 0 8px;
      }

      @media (max-width: 600px) {
        .dialog-content {
          min-width: auto;
        }

        .form-row {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class CourseFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly courseService = inject(CourseService);
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<CourseFormDialogComponent, CoursePayload | undefined>);
  readonly data = inject<CourseFormDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  readonly isEdit = !!this.data?.course;
  readonly isAdmin = this.authService.hasRole(['admin']);
  readonly teachers = signal<User[]>([]);

  readonly form = this.fb.nonNullable.group({
    code: [
      this.data?.course?.code ?? '',
      [Validators.required, Validators.minLength(3)],
      [this.codeAvailableValidator()],
    ],
    title: [this.data?.course?.title ?? '', [Validators.required, Validators.minLength(3)]],
    description: [this.data?.course?.description ?? ''],
    credits: [this.data?.course?.credits ?? 3, [Validators.required, Validators.min(1), Validators.max(10)]],
    status: [this.data?.course?.status ?? ('active' as CourseStatus), [Validators.required]],
    teacher_id: [{ value: this.data?.course?.teacher_id ?? null, disabled: !this.isAdmin }],
    modules: this.fb.array<FormGroup>([]),
  });

  get modulesArray(): FormArray<FormGroup> {
    return this.form.controls.modules;
  }

  ngOnInit(): void {
    const existingModules = this.data?.course?.modules ?? [];
    for (const mod of existingModules) {
      this.addModule(mod);
    }

    if (this.isAdmin) {
      this.userService.getUsers().subscribe({
        next: (users) => {
          this.teachers.set(users.filter((user) => user.role === 'profesor'));
        },
        error: () => {
          this.teachers.set([]);
        },
      });
    }
  }

  addModule(module?: CourseModule): void {
    const group = this.fb.nonNullable.group({
      title: [module?.title ?? '', [Validators.required]],
      hours: [module?.hours ?? 2, [Validators.required, Validators.min(1)]],
    });
    this.modulesArray.push(group);
  }

  removeModule(index: number): void {
    this.modulesArray.removeAt(index);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSubmit(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CoursePayload = {
      code: raw.code.trim(),
      title: raw.title.trim(),
      description: raw.description.trim(),
      credits: Number(raw.credits),
      status: raw.status,
      teacher_id: raw.teacher_id,
      modules: raw.modules.map((mod, index) => ({
        title: String(mod['title'] ?? '').trim(),
        hours: Number(mod['hours'] ?? 1),
        sort_order: index + 1,
      })),
    };

    this.dialogRef.close(payload);
  }

  private codeAvailableValidator(): AsyncValidatorFn {
    const initialCode = this.data?.course?.code?.trim().toLowerCase() ?? '';
    const excludeId = this.data?.course?.id;

    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = String(control.value ?? '').trim();
      if (!value || value.length < 3) {
        return of(null);
      }

      if (this.isEdit && value.toLowerCase() === initialCode) {
        return of(null);
      }

      return timer(300).pipe(
        switchMap(() => this.courseService.checkCodeAvailable(value, excludeId)),
        map((available) => (available ? null : { codeTaken: true })),
        catchError(() => of(null)),
      );
    };
  }
}
