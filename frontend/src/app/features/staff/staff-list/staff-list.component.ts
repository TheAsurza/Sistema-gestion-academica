import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffRow, User, UserPayload } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserFormDialogComponent } from '../../users/user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  imports: [FormsModule, UserFormDialogComponent, ConfirmDialogComponent],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Personal Administrativo</h1>
          <p class="text-muted small mb-0">
            Cuentas administrativas con control de gestión institucional
          </p>
        </div>

        <button
          type="button"
          class="btn btn-ink btn-sm px-3"
          (click)="openCreateDialog()"
        >
          <i class="bi bi-person-plus-fill me-1"></i>Nuevo Administrativo
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
              placeholder="Buscar por nombre, correo o teléfono..."
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
            {{ filteredStaff().length }} administrativo(s)
          </span>
        </div>

        @if (loading()) {
          <div class="text-center py-5 text-muted">
            <div class="spinner-border text-primary mb-2" role="status"></div>
            <div>Cargando personal administrativo...</div>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-0">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ error() }}</span>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadStaff()">
              Reintentar
            </button>
          </div>
        } @else if (filteredStaff().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-shield-check fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No se encontró personal administrativo con el filtro actual.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table glass-table table-hover">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>ID</th>
                  <th>Correo</th>
                  <th>Número de teléfono</th>
                  <th>Dirección</th>
                  <th class="text-end">Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (member of filteredStaff(); track member.id) {
                  <tr>
                    <td>
                      <strong>{{ member.name }}</strong>
                      @if (isCurrentUser(member)) {
                        <span class="self-badge">Tú</span>
                      }
                    </td>
                    <td class="tabular-nums fw-semibold">
                      <span class="badge rounded-pill text-bg-light border">
                        {{ member.user_code || '#' + member.id }}
                      </span>
                    </td>
                    <td>{{ member.email }}</td>
                    <td class="tabular-nums">{{ member.phone || '—' }}</td>
                    <td>{{ member.address || '—' }}</td>
                    <td class="text-end text-nowrap">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary me-1"
                        title="Editar"
                        aria-label="Editar administrativo"
                        (click)="openEditDialog(member)"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>

                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        [disabled]="isCurrentUser(member)"
                        [title]="isCurrentUser(member) ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'"
                        aria-label="Eliminar administrativo"
                        (click)="deleteCandidate.set(member)"
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

    <!-- Create / Edit Staff Modal -->
    @if (formModalOpen()) {
      <app-user-form-dialog
        [user]="editingUser()"
        defaultRole="admin"
        (saved)="onFormSaved($event)"
        (cancelled)="closeFormModal()"
      />
    }

    <!-- Delete Confirmation Modal -->
    @if (deleteCandidate(); as member) {
      <app-confirm-dialog
        title="Eliminar administrativo"
        [message]="'¿Estás seguro de eliminar a &quot;' + member.name + '&quot; (' + member.email + ')?'"
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
    `,
  ],
})
export class StaffListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly staff = signal<StaffRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');

  readonly formModalOpen = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly deleteCandidate = signal<StaffRow | null>(null);

  private readonly currentUserId = this.authService.getCurrentUser()?.id ?? null;

  readonly filteredStaff = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return this.staff();
    }
    return this.staff().filter(
      (m) =>
        (m.user_code ?? '').toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        (m.phone ?? '').toLowerCase().includes(query) ||
        (m.address ?? '').toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.getStaff().subscribe({
      next: (rows) => {
        this.staff.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el personal administrativo.');
        this.loading.set(false);
      },
    });
  }

  isCurrentUser(member: StaffRow): boolean {
    return this.currentUserId !== null && member.id === this.currentUserId;
  }

  openCreateDialog(): void {
    this.editingUser.set(null);
    this.formModalOpen.set(true);
  }

  openEditDialog(member: StaffRow): void {
    this.editingUser.set({
      id: member.id,
      name: member.name,
      email: member.email,
      role: 'admin',
      phone: member.phone,
      address: member.address,
      created_at: member.created_at,
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
          this.toast.show('Personal administrativo actualizado.', 'success');
          this.loadStaff();
        },
        error: () => {},
      });
      return;
    }

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.toast.show('Personal administrativo creado.', 'success');
        this.loadStaff();
      },
      error: () => {},
    });
  }

  onDeleteConfirmed(confirmed: boolean): void {
    const member = this.deleteCandidate();
    this.deleteCandidate.set(null);

    if (!confirmed || !member) {
      return;
    }

    if (this.isCurrentUser(member)) {
      this.toast.show('No puedes eliminar tu propia cuenta activa.', 'warning');
      return;
    }

    this.userService.deleteUser(member.id).subscribe({
      next: () => {
        this.staff.update((list) => list.filter((item) => item.id !== member.id));
        this.toast.show('Registro eliminado.', 'success');
      },
      error: () => {},
    });
  }
}
