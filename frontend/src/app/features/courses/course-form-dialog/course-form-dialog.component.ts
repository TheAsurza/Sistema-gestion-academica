import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
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
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';
import {
  Course,
  CourseModule,
  CoursePayload,
  CourseStatus,
} from '../../../core/models/course.model';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-course-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="glass-modal-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="isEdit ? 'Editar Curso' : 'Nuevo Curso'"
      (click)="cancelled.emit()"
    >
      <div class="glass-modal course-modal p-4" (click)="$event.stopPropagation()">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">{{ isEdit ? 'Editar Curso' : 'Nuevo Curso' }}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Cerrar"
            (click)="cancelled.emit()"
          ></button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSave()" class="d-flex flex-column gap-3">
          <div class="row g-3">
            <div class="col-12 col-sm-5">
              <label class="form-label small fw-semibold">Código</label>
              <input
                type="text"
                class="form-control"
                [class.is-invalid]="form.controls.code.invalid && form.controls.code.touched"
                formControlName="code"
                placeholder="Ej. ZEG-301"
              />
              @if (form.controls.code.pending) {
                <div class="form-text text-primary">Verificando disponibilidad...</div>
              } @else if (form.controls.code.hasError('required') && form.controls.code.touched) {
                <div class="text-danger small mt-1">El código es obligatorio.</div>
              } @else if (form.controls.code.hasError('minlength') && form.controls.code.touched) {
                <div class="text-danger small mt-1">Mínimo 3 caracteres.</div>
              } @else if (form.controls.code.hasError('codeTaken')) {
                <div class="text-danger small mt-1">Este código ya está registrado.</div>
              }
            </div>

            <div class="col-12 col-sm-3">
              <label class="form-label small fw-semibold">Créditos</label>
              <input
                type="number"
                class="form-control"
                [class.is-invalid]="form.controls.credits.invalid && form.controls.credits.touched"
                formControlName="credits"
                min="1"
                max="10"
              />
              @if (form.controls.credits.invalid && form.controls.credits.touched) {
                <div class="text-danger small mt-1">Entre 1 y 10.</div>
              }
            </div>

            <div class="col-12 col-sm-4">
              <label class="form-label small fw-semibold">Estado</label>
              <select class="form-select" formControlName="status">
                <option value="active">Activo</option>
                <option value="draft">Borrador</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label small fw-semibold">Título del curso</label>
            <input
              type="text"
              class="form-control"
              [class.is-invalid]="form.controls.title.invalid && form.controls.title.touched"
              formControlName="title"
              placeholder="Ej. Desarrollo de Interfaces 3"
            />
            @if (form.controls.title.hasError('required') && form.controls.title.touched) {
              <div class="text-danger small mt-1">El título es obligatorio.</div>
            } @else if (form.controls.title.hasError('minlength') && form.controls.title.touched) {
              <div class="text-danger small mt-1">Mínimo 3 caracteres.</div>
            }
          </div>

          <div>
            <label class="form-label small fw-semibold">Descripción</label>
            <textarea
              class="form-control"
              rows="2"
              formControlName="description"
              placeholder="Resumen del curso..."
            ></textarea>
          </div>

          <div>
            <label class="form-label small fw-semibold">Profesor asignado</label>
            <select class="form-select" formControlName="teacher_id">
              <option [ngValue]="null">Sin asignar</option>
              @for (teacher of teachers(); track teacher.id) {
                <option [ngValue]="teacher.id">{{ teacher.name }}</option>
              }
            </select>
            @if (!isAdmin) {
              <div class="form-text">Solo el administrador puede reasignar el profesor.</div>
            }
          </div>

          <div class="pt-2 border-top">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-semibold small">Módulos del temario ({{ modulesArray.length }})</span>
              <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                (click)="addModule()"
              >
                <i class="bi bi-plus-lg me-1"></i>Agregar módulo
              </button>
            </div>

            @if (modulesArray.length === 0) {
              <p class="text-muted small mb-0">Sin módulos agregados. Usa "Agregar módulo" para añadir el temario.</p>
            } @else {
              <div formArrayName="modules" class="d-flex flex-column gap-2">
                @for (modGroup of modulesArray.controls; track $index) {
                  <div [formGroupName]="$index" class="row g-2 align-items-start">
                    <div class="col-7 col-sm-8">
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        formControlName="title"
                        [placeholder]="'Título del módulo ' + ($index + 1)"
                      />
                    </div>
                    <div class="col-3">
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        formControlName="hours"
                        min="1"
                        placeholder="Horas"
                      />
                    </div>
                    <div class="col-2 col-sm-1 text-end">
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        aria-label="Quitar módulo"
                        (click)="removeModule($index)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                }
              </div>
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
              {{ isEdit ? 'Guardar cambios' : 'Crear curso' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .course-modal {
        max-width: 660px;
        max-height: 90vh;
        overflow-y: auto;
      }
    `,
  ],
})
export class CourseFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  @Input() course: Course | null = null;
  @Output() saved = new EventEmitter<CoursePayload>();
  @Output() cancelled = new EventEmitter<void>();

  readonly isAdmin = this.authService.hasRole(['admin']);
  readonly teachers = signal<User[]>([]);

  isEdit = false;
  private originalCode = '';

  readonly form = this.fb.nonNullable.group({
    code: [
      '',
      [Validators.required, Validators.minLength(3)],
      [this.codeAvailableValidator()],
    ],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    credits: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
    status: ['active' as CourseStatus, [Validators.required]],
    teacher_id: [null as number | null],
    modules: this.fb.array<FormGroup>([]),
  });

  get modulesArray(): FormArray<FormGroup> {
    return this.form.controls.modules;
  }

  ngOnInit(): void {
    this.isEdit = !!this.course;
    this.originalCode = this.course?.code?.trim().toUpperCase() ?? '';

    if (this.course) {
      this.form.patchValue({
        code: this.course.code,
        title: this.course.title,
        description: this.course.description ?? '',
        credits: this.course.credits,
        status: this.course.status,
        teacher_id: this.course.teacher_id ?? null,
      });

      this.course.modules.forEach((mod) => this.addModule(mod));
    }

    if (!this.isAdmin) {
      this.form.controls.teacher_id.disable();
      if (this.course?.teacher_id && this.course.teacher_name) {
        this.teachers.set([
          {
            id: this.course.teacher_id,
            name: this.course.teacher_name,
            email: '',
            role: 'profesor',
          },
        ]);
      }
      return;
    }

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.teachers.set(users.filter((u) => u.role === 'profesor'));
      },
      error: () => {
        // errorInterceptor ya notifica el error HTTP
      },
    });
  }

  addModule(mod?: CourseModule): void {
    this.modulesArray.push(
      this.fb.nonNullable.group({
        title: [mod?.title ?? '', [Validators.required, Validators.minLength(2)]],
        hours: [mod?.hours ?? 4, [Validators.required, Validators.min(1)]],
      }),
    );
  }

  removeModule(index: number): void {
    this.modulesArray.removeAt(index);
  }

  onSave(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CoursePayload = {
      code: raw.code.trim().toUpperCase(),
      title: raw.title.trim(),
      description: raw.description.trim(),
      credits: Number(raw.credits),
      status: raw.status,
      teacher_id: raw.teacher_id,
      modules: raw.modules.map((m, idx) => ({
        title: String(m['title']).trim(),
        hours: Number(m['hours']),
        sort_order: idx + 1,
      })),
    };

    this.saved.emit(payload);
  }

  private codeAvailableValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = String(control.value ?? '').trim().toUpperCase();
      if (!value || value.length < 3) {
        return of(null);
      }
      if (this.isEdit && value === this.originalCode) {
        return of(null);
      }

      return timer(300).pipe(
        switchMap(() => this.courseService.checkCodeAvailable(value, this.course?.id)),
        map((available) => (available ? null : { codeTaken: true })),
        catchError(() => of(null)),
      );
    };
  }
}
