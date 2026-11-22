import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User, UserPayload } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RoleLabelPipe } from '../../../shared/pipes/role-label.pipe';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RoleLabelPipe,
    UserFormDialogComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Gestión de Usuarios</h1>
          <p class="text-muted small mb-0">Administración de cuentas, roles y accesos</p>
        </div>

        <button
          type="button"
          class="btn btn-primary btn-sm px-3"
          (click)="openCreateDialog()"
        >
          <i class="bi bi-person-plus-fill me-1"></i>Nuevo Usuario
        </button>
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
              placeholder="Buscar por nombre, correo o rol..."
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

          <div class="d-flex flex-wrap gap-2" role="group" aria-label="Filtrar por rol">
            @for (opt of roleFilterOptions; track opt.value) {
              <button
                type="button"
                class="filter-pill"
                [class.active]="roleFilter() === opt.value"
                (click)="roleFilter.set(opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="text-center py-5 text-muted">
            <div class="spinner-border text-primary mb-2" role="status"></div>
            <div>Cargando usuarios...</div>
          </div>
        } @else if (filteredUsers().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-people fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No se encontraron usuarios con el filtro actual.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table glass-table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Registro</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (user of filteredUsers(); track user.id) {
                  <tr>
                    <td class="tabular-nums">{{ user.id }}</td>
                    <td>
                      <strong>{{ user.name }}</strong>
                      @if (isCurrentUser(user)) {
                        <span class="self-badge">Tú</span>
                      }
                    </td>
                    <td>{{ user.email }}</td>
                    <td>
                      <span class="role-chip" [attr.data-role]="user.role">
                        {{ user.role | roleLabel }}
                      </span>
                    </td>
                    <td class="small text-muted">
                      {{ user.created_at ? (user.created_at | date: 'dd/MM/yyyy HH:mm') : '—' }}
                    </td>
                    <td class="text-end text-nowrap">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary me-1"
                        title="Editar"
                        aria-label="Editar usuario"
                        (click)="openEditDialog(user)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        [disabled]="isCurrentUser(user)"
                        [title]="isCurrentUser(user) ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'"
                        aria-label="Eliminar usuario"
                        (click)="deleteCandidate.set(user)"
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

    <!-- Create / Edit User Modal -->
    @if (formModalOpen()) {
      <app-user-form-dialog
        [user]="editingUser()"
        (saved)="onFormSaved($event)"
        (cancelled)="closeFormModal()"
      />
    }

    <!-- Delete Confirmation Modal -->
    @if (deleteCandidate(); as user) {
      <app-confirm-dialog
        title="Eliminar usuario"
        [message]="'¿Estás seguro de eliminar al usuario &quot;' + user.name + '&quot; (' + user.email + ')?'"
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

      .self-badge {
        display: inline-block;
        margin-left: 8px;
        padding: 1px 8px;
        border-radius: 9999px;
        background-color: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        border: 1px solid var(--zegel-primary-border);
        font-size: 0.7rem;
        font-weight: 700;
      }

      .role-chip {
        display: inline-flex;
        align-items: center;
        padding: 2px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        background-color: var(--zegel-neutral-soft);
        color: var(--zegel-text);
        border: 1px solid var(--zegel-neutral-border);
      }

      .role-chip[data-role='admin'] {
        background-color: var(--zegel-indigo-soft);
        color: var(--zegel-indigo);
        border-color: var(--zegel-indigo-border);
      }

      .role-chip[data-role='profesor'] {
        background-color: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        border-color: var(--zegel-primary-border);
      }

      .role-chip[data-role='estudiante'] {
        background-color: var(--zegel-success-soft);
        color: var(--zegel-success);
        border-color: var(--zegel-success-border);
      }
    `,
  ],
})
export class UserListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly roleFilter = signal<'all' | 'admin' | 'profesor' | 'estudiante'>('all');

  readonly formModalOpen = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly deleteCandidate = signal<User | null>(null);

  private readonly currentUserId = this.authService.getCurrentUser()?.id ?? null;

  readonly roleFilterOptions: Array<{
    value: 'all' | 'admin' | 'profesor' | 'estudiante';
    label: string;
  }> = [
    { value: 'all', label: 'Todos' },
    { value: 'admin', label: 'Administradores' },
    { value: 'profesor', label: 'Profesores' },
    { value: 'estudiante', label: 'Estudiantes' },
  ];

  readonly filteredUsers = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter((user) => {
      const matchesRole = role === 'all' || user.role === role;
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query);
      return matchesRole && matchesQuery;
    });
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  isCurrentUser(user: User): boolean {
    return this.currentUserId !== null && user.id === this.currentUserId;
  }

  openCreateDialog(): void {
    this.editingUser.set(null);
    this.formModalOpen.set(true);
  }

  openEditDialog(user: User): void {
    this.editingUser.set(user);
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
        next: (updated) => {
          this.users.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.toast.show('Usuario actualizado correctamente.', 'success');
        },
        error: () => {
          // errorInterceptor ya muestra el mensaje de error del backend
        },
      });
      return;
    }

    this.userService.createUser(payload).subscribe({
      next: (created) => {
        this.users.update((list) => [created, ...list]);
        this.toast.show('Usuario creado correctamente.', 'success');
      },
      error: () => {
        // errorInterceptor ya muestra el mensaje de error del backend
      },
    });
  }

  onDeleteConfirmed(confirmed: boolean): void {
    const user = this.deleteCandidate();
    this.deleteCandidate.set(null);

    if (!confirmed || !user) {
      return;
    }

    if (this.isCurrentUser(user)) {
      this.toast.show('No puedes eliminar tu propia cuenta activa.', 'warning');
      return;
    }

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((list) => list.filter((item) => item.id !== user.id));
        this.toast.show('Usuario eliminado.', 'success');
      },
      error: () => {
        // errorInterceptor ya muestra el mensaje de error del backend (ej. 409)
      },
    });
  }
}
