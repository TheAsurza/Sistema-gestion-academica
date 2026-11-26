import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course } from '../../../core/models/course.model';
import { StudentActiveCourse, StudentRow, User, UserPayload } from '../../../core/models/user.model';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserFormDialogComponent } from '../../users/user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [FormsModule, UserFormDialogComponent, ConfirmDialogComponent],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Alumnos</h1>
          <p class="text-muted small mb-0">
            Directorio estudiantil, carrera y cursos activos del ciclo actual
          </p>
        </div>

        <button
          type="button"
          class="btn btn-ink btn-sm px-3"
          (click)="openCreateDialog()"
        >
          <i class="bi bi-person-plus-fill me-1"></i>Nuevo Alumno
        </button>
      </header>

      <div class="glass-card p-3 p-md-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div class="input-group search-group">
            <span class="input-group-text bg-white">
              <i class="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              class="form-control"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="Buscar por nombre, carrera o teléfono..."
            />
            @if (searchTerm()) {
              <button
                type="button"
                class="btn btn-outline-secondary bg-white"
                aria-label="Limpiar búsqueda"
                (click)="searchTerm.set('')"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            }
          </div>

          <span class="small text-muted fw-semibold">
            {{ filteredStudents().length }} alumno(s)
          </span>
        </div>

        @if (loading()) {
          <div class="text-center py-5 text-muted">
            <div class="spinner-border text-primary mb-2" role="status"></div>
            <div>Cargando alumnos...</div>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-0">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ error() }}</span>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadStudents()">
              Reintentar
            </button>
          </div>
        } @else if (filteredStudents().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-mortarboard fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No se encontraron alumnos con el filtro actual.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table glass-table table-hover">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>ID</th>
                  <th>Carrera</th>
                  <th>Número de teléfono</th>
                  <th>Dirección</th>
                  <th class="text-end">Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (student of filteredStudents(); track student.id) {
                  <tr>
                    <td>
                      <div class="fw-bold">{{ student.name }}</div>
                      <div class="small text-muted">{{ student.email }}</div>
                    </td>
                    <td class="tabular-nums fw-semibold">
                      <span class="badge rounded-pill text-bg-light border">
                        {{ student.user_code || '#' + student.id }}
                      </span>
                    </td>
                    <td>{{ student.career || 'Sin carrera asignada' }}</td>
                    <td class="tabular-nums">{{ student.phone || '—' }}</td>
                    <td>{{ student.address || '—' }}</td>
                    <td class="text-end text-nowrap">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary me-1"
                        title="Ver detalle y gestionar cursos"
                        aria-label="Ver detalle y gestionar cursos del alumno"
                        (click)="openDetailModal(student)"
                      >
                        <i class="bi bi-journal-check"></i>
                      </button>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary me-1"
                        title="Editar"
                        aria-label="Editar alumno"
                        (click)="openEditDialog(student)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        title="Eliminar"
                        aria-label="Eliminar alumno"
                        (click)="deleteCandidate.set(student)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    <!-- Student Detail Modal: Active Courses in Current Cycle -->
    @if (detailStudent(); as student) {
      <div
        class="glass-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del alumno"
        (click)="detailStudent.set(null)"
      >
        <div class="glass-modal detail-modal p-4" (click)="$event.stopPropagation()">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 class="fw-bold mb-1">{{ student.name }}</h5>
              <div class="small text-muted">
                <span>{{ student.user_code || '#' + student.id }}</span> &middot;
                <span>{{ student.career || 'Sin carrera asignada' }}</span>
              </div>
            </div>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
              (click)="detailStudent.set(null)"
            ></button>
          </div>

          <div class="d-flex flex-wrap gap-3 small text-muted mb-3 pb-3 border-bottom">
            <span><i class="bi bi-envelope me-1"></i>{{ student.email }}</span>
            <span><i class="bi bi-telephone me-1"></i>{{ student.phone || '—' }}</span>
            <span><i class="bi bi-geo-alt me-1"></i>{{ student.address || '—' }}</span>
          </div>

          <h6 class="fw-bold small text-uppercase text-muted mb-2">
            Cursos activos en el presente ciclo ({{ student.active_courses.length }})
          </h6>

          @if (student.active_courses.length === 0) {
            <p class="text-muted small mb-3">
              El alumno no tiene cursos activos matriculados en el ciclo actual.
            </p>
          } @else {
            <ul class="list-group list-group-flush mb-3">
              @for (course of student.active_courses; track course.enrollment_id) {
                <li class="list-group-item bg-transparent px-0 d-flex justify-content-between align-items-center gap-2 small">
                  <div class="min-w-0">
                    <div class="fw-bold text-truncate">{{ course.code }} — {{ course.title }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">
                      Ciclo {{ course.cycle }} &middot; {{ course.teacher_name || 'Docente por asignar' }}
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2 flex-shrink-0">
                    <span class="badge rounded-pill text-bg-light border">{{ course.credits }} créd.</span>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger py-0 px-2"
                      title="Retirar del curso"
                      aria-label="Retirar del curso"
                      [disabled]="unenrollingId() === course.enrollment_id"
                      (click)="unenrollCourse(student, course)"
                    >
                      @if (unenrollingId() === course.enrollment_id) {
                        <span class="spinner-border spinner-border-sm"></span>
                      } @else {
                        <i class="bi bi-x-lg"></i>
                      }
                    </button>
                  </div>
                </li>
              }
            </ul>
          }

          <div class="enroll-box p-3 rounded-3 mb-3">
            <label for="enrollCourseSelect" class="form-label small fw-bold mb-2">
              Matricular en curso (Ciclo 2026-II)
            </label>
            <div class="d-flex gap-2">
              <select
                id="enrollCourseSelect"
                class="form-select form-select-sm"
                [ngModel]="selectedCourseId()"
                (ngModelChange)="selectedCourseId.set(+$event || null)"
                [disabled]="enrolling() || availableCoursesForDetail().length === 0"
              >
                <option [ngValue]="null">
                  {{
                    availableCoursesForDetail().length === 0
                      ? 'No hay más cursos activos disponibles'
                      : 'Seleccionar curso...'
                  }}
                </option>
                @for (c of availableCoursesForDetail(); track c.id) {
                  <option [ngValue]="c.id">
                    {{ c.code }} — {{ c.title }} ({{ c.career || 'General' }})
                  </option>
                }
              </select>
              <button
                type="button"
                class="btn btn-primary btn-sm px-3 text-nowrap"
                [disabled]="!selectedCourseId() || enrolling()"
                (click)="enrollSelectedCourse(student)"
              >
                @if (enrolling()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                } @else {
                  <i class="bi bi-plus-lg me-1"></i>
                }
                Matricular
              </button>
            </div>
          </div>

          <div class="text-end">
            <button type="button" class="btn btn-ink btn-sm px-4" (click)="detailStudent.set(null)">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Create / Edit Student Modal -->
    @if (formModalOpen()) {
      <app-user-form-dialog
        [user]="editingUser()"
        defaultRole="estudiante"
        (saved)="onFormSaved($event)"
        (cancelled)="closeFormModal()"
      />
    }

    <!-- Delete Confirmation Modal -->
    @if (deleteCandidate(); as student) {
      <app-confirm-dialog
        title="Eliminar alumno"
        [message]="'¿Estás seguro de eliminar al alumno &quot;' + student.name + '&quot;?'"
        confirmText="Eliminar"
        (confirmed)="onDeleteConfirmed($event)"
      />
    }
  `,
  styles: [
    `
      .search-group {
        max-width: 360px;
      }

      .detail-modal {
        max-width: 580px;
      }

      .enroll-box {
        background: #f7f8fc;
        border: 1px solid var(--zegel-border);
      }
    `,
  ],
})
export class StudentListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly courseService = inject(CourseService);
  private readonly toast = inject(ToastService);

  readonly students = signal<StudentRow[]>([]);
  readonly allCourses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');

  readonly detailStudent = signal<StudentRow | null>(null);
  readonly selectedCourseId = signal<number | null>(null);
  readonly enrolling = signal(false);
  readonly unenrollingId = signal<number | null>(null);
  readonly formModalOpen = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly deleteCandidate = signal<StudentRow | null>(null);

  readonly availableCoursesForDetail = computed(() => {
    const student = this.detailStudent();
    if (!student) {
      return [];
    }
    const enrolledIds = new Set(student.active_courses.map((c) => c.course_id));
    const career = (student.career ?? '').trim().toLowerCase();

    return this.allCourses()
      .filter((c) => c.status === 'active' && !enrolledIds.has(c.id))
      .sort((a, b) => {
        const aMatch = career !== '' && (a.career ?? '').trim().toLowerCase() === career ? 0 : 1;
        const bMatch = career !== '' && (b.career ?? '').trim().toLowerCase() === career ? 0 : 1;
        if (aMatch !== bMatch) {
          return aMatch - bMatch;
        }
        return a.code.localeCompare(b.code);
      });
  });

  readonly filteredStudents = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return this.students();
    }
    return this.students().filter(
      (s) =>
        (s.user_code ?? '').toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        (s.career ?? '').toLowerCase().includes(query) ||
        (s.phone ?? '').toLowerCase().includes(query) ||
        (s.address ?? '').toLowerCase().includes(query),
    );
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.detailStudent()) {
      this.detailStudent.set(null);
    }
  }

  ngOnInit(): void {
    this.loadStudents();
    this.courseService.getCourses().subscribe({
      next: (courses) => this.allCourses.set(courses),
      error: () => {},
    });
  }

  openDetailModal(student: StudentRow): void {
    this.selectedCourseId.set(null);
    this.detailStudent.set(student);
  }

  enrollSelectedCourse(student: StudentRow): void {
    const courseId = this.selectedCourseId();
    if (!courseId || this.enrolling()) {
      return;
    }

    this.enrolling.set(true);
    this.userService.enrollStudent(student.id, courseId, '2026-II').subscribe({
      next: (newCourse) => {
        this.enrolling.set(false);
        this.selectedCourseId.set(null);
        this.syncStudentCourses(student.id, [...student.active_courses, newCourse]);
        this.toast.show(`Alumno matriculado en ${newCourse.code}.`, 'success');
      },
      error: () => {
        this.enrolling.set(false);
      },
    });
  }

  unenrollCourse(student: StudentRow, course: StudentActiveCourse): void {
    if (this.unenrollingId() !== null) {
      return;
    }

    this.unenrollingId.set(course.enrollment_id);
    this.userService.unenrollStudent(course.enrollment_id).subscribe({
      next: () => {
        this.unenrollingId.set(null);
        const updated = student.active_courses.filter(
          (c) => c.enrollment_id !== course.enrollment_id,
        );
        this.syncStudentCourses(student.id, updated);
        this.toast.show(`Curso ${course.code} retirado.`, 'success');
      },
      error: () => {
        this.unenrollingId.set(null);
      },
    });
  }

  private syncStudentCourses(studentId: number, activeCourses: StudentActiveCourse[]): void {
    this.students.update((list) =>
      list.map((s) => (s.id === studentId ? { ...s, active_courses: activeCourses } : s)),
    );
    const current = this.detailStudent();
    if (current && current.id === studentId) {
      this.detailStudent.set({ ...current, active_courses: activeCourses });
    }
  }

  loadStudents(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.getStudents().subscribe({
      next: (rows) => {
        this.students.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de alumnos.');
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    this.editingUser.set(null);
    this.formModalOpen.set(true);
  }

  openEditDialog(student: StudentRow): void {
    this.editingUser.set({
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'estudiante',
      career: student.career,
      phone: student.phone,
      address: student.address,
      created_at: student.created_at,
    });
    this.formModalOpen.set(true);
  }

  closeFormModal(): void {
    this.formModalOpen.set(false);
    this.editingUser.set(null);
  }

  onFormSaved(payload: UserPayload): void {
    const editing = this.editingUser();
    this.closeFormModal();

    if (editing) {
      this.userService.updateUser(editing.id, payload).subscribe({
        next: () => {
          this.toast.show('Alumno actualizado correctamente.', 'success');
          this.loadStudents();
        },
        error: () => {},
      });
      return;
    }

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.toast.show('Alumno creado correctamente.', 'success');
        this.loadStudents();
      },
      error: () => {},
    });
  }

  onDeleteConfirmed(confirmed: boolean): void {
    const student = this.deleteCandidate();
    this.deleteCandidate.set(null);

    if (!confirmed || !student) {
      return;
    }

    this.userService.deleteUser(student.id).subscribe({
      next: () => {
        this.students.update((list) => list.filter((item) => item.id !== student.id));
        this.toast.show('Alumno eliminado.', 'success');
      },
      error: () => {},
    });
  }
}
