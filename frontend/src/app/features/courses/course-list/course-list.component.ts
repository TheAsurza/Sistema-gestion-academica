import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Course, CoursePayload } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { HighlightStatusDirective } from '../../../shared/directives/highlight-status.directive';
import { CourseStatusPipe } from '../../../shared/pipes/course-status.pipe';
import { CourseFormDialogComponent } from '../course-form-dialog/course-form-dialog.component';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    HasRoleDirective,
    HighlightStatusDirective,
    CourseStatusPipe,
    CourseFormDialogComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Gestión de Cursos</h1>
          <p class="text-muted small mb-0">Catálogo académico de cursos y módulos</p>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <a
            *appHasRole="['estudiante']"
            class="btn btn-outline-primary bg-white bg-opacity-50 btn-sm"
            routerLink="/courses/history"
          >
            <i class="bi bi-award me-1"></i>Ver historial de notas
          </a>

          <button
            *appHasRole="['admin']"
            type="button"
            class="btn btn-primary btn-sm px-3"
            (click)="openCreateDialog()"
          >
            <i class="bi bi-plus-lg me-1"></i>Nuevo Curso
          </button>
        </div>
      </header>

      <div class="glass-card p-3 p-md-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div class="input-group search-group">
            <span class="input-group-text bg-white bg-opacity-75">
              <i class="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              class="form-control"
              [ngModel]="searchTerm()"
              (ngModelChange)="searchTerm.set($event)"
              placeholder="Buscar por código o título..."
            />
            @if (searchTerm()) {
              <button
                type="button"
                class="btn btn-outline-secondary bg-white bg-opacity-75"
                aria-label="Limpiar búsqueda"
                (click)="searchTerm.set('')"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            }
          </div>

          <div class="d-flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            @for (opt of statusFilterOptions; track opt.value) {
              <button
                type="button"
                class="filter-pill"
                [class.active]="statusFilter() === opt.value"
                (click)="statusFilter.set(opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="text-center py-5 text-muted">
            <div class="spinner-border text-primary mb-2" role="status"></div>
            <div>Cargando cursos...</div>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-0">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ error() }}</span>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadCourses()">
              Reintentar
            </button>
          </div>
        } @else if (filteredCourses().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-journal-bookmark fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No se encontraron cursos con el filtro actual.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table glass-table table-hover">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Créditos</th>
                  <th>Profesor</th>
                  <th>Estado</th>
                  <th>Módulos</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (course of filteredCourses(); track course.id) {
                  <tr>
                    <td><strong>{{ course.code }}</strong></td>
                    <td>{{ course.title }}</td>
                    <td class="tabular-nums">{{ course.credits }}</td>
                    <td>{{ course.teacher_name || 'Sin asignar' }}</td>
                    <td>
                      <span [appHighlightStatus]="course.status">
                        {{ course.status | courseStatus }}
                      </span>
                    </td>
                    <td class="tabular-nums">{{ course.modules.length }}</td>
                    <td class="text-end text-nowrap">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary me-1"
                        title="Ver detalle"
                        aria-label="Ver detalle"
                        (click)="detailCourse.set(course)"
                      >
                        <i class="bi bi-eye"></i>
                      </button>

                      <button
                        *appHasRole="['admin', 'profesor']"
                        type="button"
                        class="btn btn-sm btn-outline-primary me-1"
                        title="Editar"
                        aria-label="Editar curso"
                        (click)="openEditDialog(course)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>

                      <button
                        *appHasRole="['admin']"
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        title="Eliminar"
                        aria-label="Eliminar curso"
                        (click)="deleteCandidate.set(course)"
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

    <!-- Course Detail Modal -->
    @if (detailCourse(); as course) {
      <div
        class="glass-modal-backdrop"
        role="dialog"
        aria-modal="true"
        (click)="detailCourse.set(null)"
      >
        <div class="glass-modal detail-modal p-4" (click)="$event.stopPropagation()">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 class="fw-bold mb-1">{{ course.code }} - {{ course.title }}</h5>
              <div class="d-flex flex-wrap align-items-center gap-3 small text-muted">
                <span><strong>Créditos:</strong> {{ course.credits }}</span>
                <span><strong>Profesor:</strong> {{ course.teacher_name || 'Sin asignar' }}</span>
                <span [appHighlightStatus]="course.status">{{ course.status | courseStatus }}</span>
              </div>
            </div>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
              (click)="detailCourse.set(null)"
            ></button>
          </div>

          <p class="small text-secondary mb-3">
            {{ course.description || 'Sin descripción registrada.' }}
          </p>

          <h6 class="fw-bold small text-uppercase text-muted mb-2">
            Módulos ({{ course.modules.length }})
          </h6>
          @if (course.modules.length === 0) {
            <p class="text-muted small mb-0">Este curso aún no tiene módulos registrados.</p>
          } @else {
            <ul class="list-group list-group-flush mb-3">
              @for (mod of course.modules; track $index) {
                <li class="list-group-item bg-transparent px-0 d-flex justify-content-between align-items-center small">
                  <span><i class="bi bi-file-text me-2 text-primary"></i>{{ $index + 1 }}. {{ mod.title }}</span>
                  <span class="badge text-bg-light border">{{ mod.hours }} h</span>
                </li>
              }
            </ul>
          }

          <div class="text-end">
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="detailCourse.set(null)">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Create / Edit Course Modal -->
    @if (formModalOpen()) {
      <app-course-form-dialog
        [course]="editingCourse()"
        (saved)="onFormSaved($event)"
        (cancelled)="closeFormModal()"
      />
    }

    <!-- Delete Confirmation Modal -->
    @if (deleteCandidate(); as course) {
      <app-confirm-dialog
        title="Eliminar curso"
        [message]="'¿Estás seguro de eliminar el curso &quot;' + course.code + ' - ' + course.title + '&quot;?'"
        confirmText="Eliminar"
        (confirmed)="onDeleteConfirmed($event)"
      />
    }
  `,
  styles: [
    `
      .search-group {
        max-width: 340px;
      }

      .filter-pill {
        border: 1px solid var(--zegel-border);
        background: rgba(255, 255, 255, 0.72);
        color: var(--zegel-muted);
        border-radius: 9999px;
        padding: 5px 14px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 150ms ease;
      }

      .filter-pill:hover {
        background: #ffffff;
        color: var(--zegel-text);
      }

      .filter-pill.active {
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        border-color: var(--zegel-primary-border);
      }

      .detail-modal {
        max-width: 540px;
      }
    `,
  ],
})
export class CourseListComponent implements OnInit {
  private readonly courseService = inject(CourseService);
  private readonly toast = inject(ToastService);

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'draft' | 'inactive'>('all');

  readonly detailCourse = signal<Course | null>(null);
  readonly formModalOpen = signal(false);
  readonly editingCourse = signal<Course | null>(null);
  readonly deleteCandidate = signal<Course | null>(null);

  readonly statusFilterOptions: Array<{
    value: 'all' | 'active' | 'draft' | 'inactive';
    label: string;
  }> = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'draft', label: 'Borradores' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  readonly filteredCourses = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.courses().filter((course) => {
      const matchesStatus = status === 'all' || course.status === status;
      const matchesQuery =
        !query ||
        course.code.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.detailCourse()) {
      this.detailCourse.set(null);
    }
  }

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading.set(true);
    this.error.set(null);
    this.courseService.getCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los cursos.');
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    this.editingCourse.set(null);
    this.formModalOpen.set(true);
  }

  openEditDialog(course: Course): void {
    this.editingCourse.set(course);
    this.formModalOpen.set(true);
  }

  closeFormModal(): void {
    this.formModalOpen.set(false);
    this.editingCourse.set(null);
  }

  onFormSaved(payload: CoursePayload): void {
    const editing = this.editingCourse();
    this.closeFormModal();

    if (editing) {
      this.courseService.updateCourse(editing.id, payload).subscribe({
        next: (updated) => {
          this.courses.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.toast.show('Curso actualizado correctamente.', 'success');
        },
        error: () => {
          // errorInterceptor ya notifica el error HTTP
        },
      });
      return;
    }

    this.courseService.createCourse(payload).subscribe({
      next: (created) => {
        this.courses.update((list) => [created, ...list]);
        this.toast.show('Curso creado correctamente.', 'success');
      },
      error: () => {
        // errorInterceptor ya notifica el error HTTP
      },
    });
  }

  onDeleteConfirmed(confirmed: boolean): void {
    const course = this.deleteCandidate();
    this.deleteCandidate.set(null);

    if (!confirmed || !course) {
      return;
    }

    this.courseService.deleteCourse(course.id).subscribe({
      next: () => {
        this.courses.update((list) => list.filter((item) => item.id !== course.id));
        this.toast.show('Curso eliminado.', 'success');
      },
      error: () => {
        // errorInterceptor ya notifica el error HTTP
      },
    });
  }
}
