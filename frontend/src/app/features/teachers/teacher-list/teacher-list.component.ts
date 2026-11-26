import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeacherRow, User, UserPayload } from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserFormDialogComponent } from '../../users/user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [FormsModule, UserFormDialogComponent, ConfirmDialogComponent],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Profesores</h1>
          <p class="text-muted small mb-0">
            Directorio docente, cursos asignados y datos de contacto
          </p>
        </div>

        <button
          type="button"
          class="btn btn-ink btn-sm px-3"
          (click)="openCreateDialog()"
        >
          <i class="bi bi-person-plus-fill me-1"></i>Nuevo Profesor
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
              placeholder="Buscar por nombre, curso o teléfono..."
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
            {{ filteredTeachers().length }} profesor(es)
          </span>
        </div>

        @if (loading()) {
          <div class="text-center py-5 text-muted">
            <div class="spinner-border text-primary mb-2" role="status"></div>
            <div>Cargando profesores...</div>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-0">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ error() }}</span>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadTeachers()">
              Reintentar
            </button>
          </div>
        } @else if (filteredTeachers().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-person-workspace fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No se encontraron profesores con el filtro actual.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table glass-table table-hover">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>ID</th>
                  <th>Curso</th>
                  <th>Clases asignadas</th>
                  <th>Número de teléfono</th>
                  <th>Dirección</th>
                  <th class="text-end">Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (teacher of filteredTeachers(); track teacher.id) {
                  <tr>
                    <td>
                      <div class="fw-bold">{{ teacher.name }}</div>
                      <div class="small text-muted">{{ teacher.email }}</div>
                    </td>
                    <td class="tabular-nums fw-semibold">
                      <span class="badge rounded-pill text-bg-light border">
                        {{ teacher.user_code || '#' + teacher.id }}
                      </span>
                    </td>
                    <td>{{ teacher.courses_summary }}</td>
                    <td class="tabular-nums">
                      <span class="classes-pill">{{ teacher.assigned_classes }} clases</span>
                    </td>
                    <td class="tabular-nums">{{ teacher.phone || '—' }}</td>
                    <td>{{ teacher.address || '—' }}</td>
                    <td class="text-end text-nowrap">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary me-1"
                        title="Editar"
                        aria-label="Editar profesor"
                        (click)="openEditDialog(teacher)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        title="Eliminar"
                        aria-label="Eliminar profesor"
                        (click)="deleteCandidate.set(teacher)"
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

    <!-- Create / Edit Teacher Modal -->
    @if (formModalOpen()) {
      <app-user-form-dialog
        [user]="editingUser()"
        defaultRole="profesor"
        (saved)="onFormSaved($event)"
        (cancelled)="closeFormModal()"
      />
    }

    <!-- Delete Confirmation Modal -->
    @if (deleteCandidate(); as teacher) {
      <app-confirm-dialog
        title="Eliminar profesor"
        [message]="'¿Estás seguro de eliminar a &quot;' + teacher.name + '&quot;? Sus cursos quedarán sin docente asignado.'"
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

      .classes-pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 9999px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        font-size: 0.75rem;
        font-weight: 700;
      }
    `,
  ],
})
export class TeacherListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  readonly teachers = signal<TeacherRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');

  readonly formModalOpen = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly deleteCandidate = signal<TeacherRow | null>(null);

  readonly filteredTeachers = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return this.teachers();
    }
    return this.teachers().filter(
      (t) =>
        (t.user_code ?? '').toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.courses_summary.toLowerCase().includes(query) ||
        (t.phone ?? '').toLowerCase().includes(query) ||
        (t.address ?? '').toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.getTeachers().subscribe({
      next: (rows) => {
        this.teachers.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de profesores.');
        this.loading.set(false);
      },
    });
  }

  openCreateDialog(): void {
    this.editingUser.set(null);
    this.formModalOpen.set(true);
  }

  openEditDialog(teacher: TeacherRow): void {
    this.editingUser.set({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: 'profesor',
      phone: teacher.phone,
      address: teacher.address,
      created_at: teacher.created_at,
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
          this.toast.show('Profesor actualizado correctamente.', 'success');
          this.loadTeachers();
        },
        error: () => {
          // errorInterceptor ya notifica el error HTTP
        },
      });
      return;
    }

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.toast.show('Profesor creado correctamente.', 'success');
        this.loadTeachers();
      },
      error: () => {
        // errorInterceptor ya notifica el error HTTP
      },
    });
  }

  onDeleteConfirmed(confirmed: boolean): void {
    const teacher = this.deleteCandidate();
    this.deleteCandidate.set(null);

    if (!confirmed || !teacher) {
      return;
    }

    this.userService.deleteUser(teacher.id).subscribe({
      next: () => {
        this.teachers.update((list) => list.filter((item) => item.id !== teacher.id));
        this.toast.show('Profesor eliminado.', 'success');
      },
      error: () => {
        // errorInterceptor ya notifica el error HTTP
      },
    });
  }
}
