import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs';
import { User, UserPayload } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
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
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    RoleLabelPipe,
  ],
  template: `
    <div class="users-container">
      <header class="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p class="subtitle">Administración de cuentas, roles y accesos</p>
        </div>

        <button mat-flat-button color="primary" type="button" (click)="openCreateDialog()">
          <mat-icon>person_add</mat-icon>
          Nuevo Usuario
        </button>
      </header>

      <mat-card class="table-card">
        <mat-card-content>
          <div class="toolbar-row">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Buscar por nombre, correo o rol</mat-label>
              <input
                matInput
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
                placeholder="Ej. Ana, @zegel.edu.pe o profesor"
              />
              <mat-icon matPrefix>search</mat-icon>
              @if (searchTerm()) {
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  aria-label="Limpiar búsqueda"
                  (click)="searchTerm.set('')"
                >
                  <mat-icon>close</mat-icon>
                </button>
              }
            </mat-form-field>

            <div class="filter-pills" role="group" aria-label="Filtrar por rol">
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
            <div class="loading-state">
              <mat-spinner diameter="36"></mat-spinner>
              <span>Cargando usuarios...</span>
            </div>
          } @else if (filteredUsers().length === 0) {
            <div class="empty-state">
              <mat-icon>group</mat-icon>
              <p>No se encontraron usuarios con el filtro actual.</p>
            </div>
          } @else {
            <div class="table-wrapper">
              <table mat-table [dataSource]="filteredUsers()" class="users-table">
                <ng-container matColumnDef="id">
                  <th mat-header-cell *matHeaderCellDef>ID</th>
                  <td mat-cell *matCellDef="let user">{{ user.id }}</td>
                </ng-container>

                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Nombre</th>
                  <td mat-cell *matCellDef="let user">
                    <strong>{{ user.name }}</strong>
                    @if (isCurrentUser(user)) {
                      <span class="self-badge">Tú</span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Correo</th>
                  <td mat-cell *matCellDef="let user">{{ user.email }}</td>
                </ng-container>

                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef>Rol</th>
                  <td mat-cell *matCellDef="let user">
                    <span class="role-chip" [attr.data-role]="user.role">
                      {{ user.role | roleLabel }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="created_at">
                  <th mat-header-cell *matHeaderCellDef>Fecha de registro</th>
                  <td mat-cell *matCellDef="let user">
                    {{ user.created_at ? (user.created_at | date: 'dd/MM/yyyy HH:mm') : '—' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let user" class="actions-cell">
                    <button
                      mat-icon-button
                      color="primary"
                      type="button"
                      matTooltip="Editar"
                      aria-label="Editar usuario"
                      (click)="openEditDialog(user)"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>

                    <button
                      mat-icon-button
                      color="warn"
                      class="delete-action-btn"
                      type="button"
                      [disabled]="isCurrentUser(user)"
                      [matTooltip]="
                        isCurrentUser(user)
                          ? 'No puedes eliminar tu propia cuenta'
                          : 'Eliminar'
                      "
                      aria-label="Eliminar usuario"
                      (click)="confirmDelete(user)"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .users-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
      }

      .page-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--zegel-text);
      }

      .subtitle {
        margin: 4px 0 0;
        color: var(--zegel-muted);
        font-size: 14px;
      }

      .toolbar-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }

      .search-field {
        width: 100%;
        max-width: 360px;
      }

      .filter-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .filter-pill {
        border: 1px solid var(--zegel-border);
        background: var(--zegel-surface);
        color: var(--zegel-muted);
        border-radius: 9999px;
        padding: 6px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 150ms ease;
      }

      .filter-pill:hover {
        background: #f1f5f9;
        color: var(--zegel-text);
      }

      .filter-pill.active {
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        border-color: #bfdbfe;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .users-table {
        width: 100%;
      }

      .self-badge {
        display: inline-block;
        margin-left: 8px;
        padding: 1px 8px;
        border-radius: 9999px;
        background-color: #e3f2fd;
        color: #1565c0;
        font-size: 11px;
        font-weight: 600;
      }

      .role-chip {
        display: inline-flex;
        align-items: center;
        padding: 2px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 500;
        background-color: #eceff1;
        color: #37474f;
      }

      .role-chip[data-role='admin'] {
        background-color: #ede7f6;
        color: #4527a0;
      }

      .role-chip[data-role='profesor'] {
        background-color: #e3f2fd;
        color: #1565c0;
      }

      .role-chip[data-role='estudiante'] {
        background-color: #e8f5e9;
        color: #2e7d32;
      }

      .actions-cell {
        white-space: nowrap;
      }

      .delete-action-btn:not(:disabled) {
        color: var(--mat-sys-error);
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 40px 16px;
        color: #757575;
      }
    `,
  ],
})
export class UserListComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = ['id', 'name', 'email', 'role', 'created_at', 'actions'];

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly roleFilter = signal<'all' | 'admin' | 'profesor' | 'estudiante'>('all');
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
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '500px',
      data: null,
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((payload): payload is UserPayload => !!payload),
        switchMap((payload) => this.userService.createUser(payload)),
      )
      .subscribe({
        next: (created) => {
          this.users.update((list) => [created, ...list]);
          this.snackBar.open('Usuario creado correctamente.', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          // errorInterceptor ya muestra el mensaje de error del backend
        },
      });
  }

  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '500px',
      data: { user },
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((payload): payload is UserPayload => !!payload),
        switchMap((payload) => this.userService.updateUser(user.id, payload)),
      )
      .subscribe({
        next: (updated) => {
          this.users.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.snackBar.open('Usuario actualizado correctamente.', 'Cerrar', {
            duration: 3000,
          });
        },
        error: () => {
          // errorInterceptor ya muestra el mensaje de error del backend
        },
      });
  }

  confirmDelete(user: User): void {
    if (this.isCurrentUser(user)) {
      this.snackBar.open('No puedes eliminar tu propia cuenta de administrador.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar usuario',
        message: `¿Estás seguro de eliminar al usuario "${user.name}" (${user.email})?`,
        confirmText: 'Eliminar',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.userService.deleteUser(user.id)),
      )
      .subscribe({
        next: () => {
          this.users.update((list) => list.filter((item) => item.id !== user.id));
          this.snackBar.open('Usuario eliminado.', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          // errorInterceptor ya muestra el mensaje de error del backend
        },
      });
  }
}
