import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { Course, CoursePayload } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { HighlightStatusDirective } from '../../../shared/directives/highlight-status.directive';
import { CourseStatusPipe } from '../../../shared/pipes/course-status.pipe';
import { CourseFormDialogComponent } from '../course-form-dialog/course-form-dialog.component';

@Component({
  selector: 'app-course-detail-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    CourseStatusPipe,
    HighlightStatusDirective,
  ],
  template: `
    <h2 mat-dialog-title>{{ course.code }} - {{ course.title }}</h2>
    <mat-dialog-content class="detail-content">
      <div class="detail-meta">
        <span><strong>Créditos:</strong> {{ course.credits }}</span>
        <span><strong>Profesor:</strong> {{ course.teacher_name || 'Sin asignar' }}</span>
        <span [appHighlightStatus]="course.status">{{ course.status | courseStatus }}</span>
      </div>

      <p class="detail-description">
        {{ course.description || 'Sin descripción registrada.' }}
      </p>

      <h3>Módulos ({{ course.modules.length }})</h3>
      @if (course.modules.length === 0) {
        <p class="empty-text">Este curso aún no tiene módulos registrados.</p>
      } @else {
        <mat-list>
          @for (mod of course.modules; track $index) {
            <mat-list-item>
              <mat-icon matListItemIcon>article</mat-icon>
              <span matListItemTitle>{{ $index + 1 }}. {{ mod.title }}</span>
              <span matListItemLine>{{ mod.hours }} horas</span>
            </mat-list-item>
          }
        </mat-list>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .detail-content {
        min-width: 440px;
        max-width: 100%;
      }

      .detail-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
        font-size: 14px;
      }

      .detail-description {
        color: #424242;
        margin-bottom: 16px;
      }

      .empty-text {
        color: #757575;
        font-size: 13px;
      }

      @media (max-width: 540px) {
        .detail-content {
          min-width: auto;
        }
      }
    `,
  ],
})
export class CourseDetailDialogComponent {
  readonly course = inject<Course>(MAT_DIALOG_DATA);
}

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    HasRoleDirective,
    HighlightStatusDirective,
    CourseStatusPipe,
  ],
  template: `
    <div class="courses-container">
      <header class="page-header">
        <div>
          <h1>Gestión de Cursos</h1>
          <p class="subtitle">Catálogo académico de cursos y módulos</p>
        </div>

        <div class="header-actions">
          <a
            *appHasRole="['estudiante']"
            mat-stroked-button
            color="primary"
            routerLink="/courses/history"
          >
            <mat-icon>grade</mat-icon>
            Ver historial de notas
          </a>

          <button
            *appHasRole="['admin']"
            mat-flat-button
            color="primary"
            type="button"
            (click)="openCreateDialog()"
          >
            <mat-icon>add</mat-icon>
            Nuevo Curso
          </button>
        </div>
      </header>

      <mat-card class="table-card">
        <mat-card-content>
          <div class="toolbar-row">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Buscar por código o título</mat-label>
              <input
                matInput
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
                placeholder="Ej. ZEG-101 o Interfaces"
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
          </div>

          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="36"></mat-spinner>
              <span>Cargando cursos...</span>
            </div>
          } @else if (filteredCourses().length === 0) {
            <div class="empty-state">
              <mat-icon>menu_book</mat-icon>
              <p>No se encontraron cursos con el filtro actual.</p>
            </div>
          } @else {
            <div class="table-wrapper">
              <table mat-table [dataSource]="filteredCourses()" class="courses-table">
                <ng-container matColumnDef="code">
                  <th mat-header-cell *matHeaderCellDef>Código</th>
                  <td mat-cell *matCellDef="let course">
                    <strong>{{ course.code }}</strong>
                  </td>
                </ng-container>

                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Título</th>
                  <td mat-cell *matCellDef="let course">{{ course.title }}</td>
                </ng-container>

                <ng-container matColumnDef="credits">
                  <th mat-header-cell *matHeaderCellDef>Créditos</th>
                  <td mat-cell *matCellDef="let course">{{ course.credits }}</td>
                </ng-container>

                <ng-container matColumnDef="teacher_name">
                  <th mat-header-cell *matHeaderCellDef>Profesor</th>
                  <td mat-cell *matCellDef="let course">
                    {{ course.teacher_name || 'Sin asignar' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let course">
                    <span [appHighlightStatus]="course.status">
                      {{ course.status | courseStatus }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="modules">
                  <th mat-header-cell *matHeaderCellDef>Módulos</th>
                  <td mat-cell *matCellDef="let course">{{ course.modules.length }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let course" class="actions-cell">
                    <button
                      mat-icon-button
                      type="button"
                      matTooltip="Ver detalle"
                      (click)="openDetailDialog(course)"
                    >
                      <mat-icon>visibility</mat-icon>
                    </button>

                    <button
                      *appHasRole="['admin', 'profesor']"
                      mat-icon-button
                      color="primary"
                      type="button"
                      matTooltip="Editar"
                      (click)="openEditDialog(course)"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>

                    <button
                      *appHasRole="['admin']"
                      mat-icon-button
                      color="warn"
                      class="delete-action-btn"
                      type="button"
                      matTooltip="Eliminar"
                      (click)="confirmDelete(course)"
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
      .courses-container {
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
        font-weight: 600;
        color: #1a237e;
      }

      .subtitle {
        margin: 4px 0 0;
        color: #616161;
        font-size: 14px;
      }

      .header-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .header-actions a,
      .header-actions button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .table-card {
        border-radius: 12px;
      }

      .toolbar-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .search-field {
        width: 100%;
        max-width: 380px;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .courses-table {
        width: 100%;
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
export class CourseListComponent implements OnInit {
  private readonly courseService = inject(CourseService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly displayedColumns = [
    'code',
    'title',
    'credits',
    'teacher_name',
    'status',
    'modules',
    'actions',
  ];

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');

  readonly filteredCourses = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) {
      return this.courses();
    }
    return this.courses().filter(
      (course) =>
        course.code.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading.set(true);
    this.courseService.getCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  openDetailDialog(course: Course): void {
    this.dialog.open(CourseDetailDialogComponent, {
      data: course,
      width: '520px',
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CourseFormDialogComponent, {
      width: '620px',
      data: null,
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((payload): payload is CoursePayload => !!payload),
        switchMap((payload) => this.courseService.createCourse(payload)),
      )
      .subscribe({
        next: (created) => {
          this.courses.update((list) => [created, ...list]);
          this.snackBar.open('Curso creado correctamente.', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          // errorInterceptor ya notifica el error HTTP al usuario
        },
      });
  }

  openEditDialog(course: Course): void {
    const dialogRef = this.dialog.open(CourseFormDialogComponent, {
      width: '620px',
      data: { course },
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((payload): payload is CoursePayload => !!payload),
        switchMap((payload) => this.courseService.updateCourse(course.id, payload)),
      )
      .subscribe({
        next: (updated) => {
          this.courses.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.snackBar.open('Curso actualizado correctamente.', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          // errorInterceptor ya notifica el error HTTP al usuario
        },
      });
  }

  confirmDelete(course: Course): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar curso',
        message: `¿Estás seguro de eliminar el curso "${course.code} - ${course.title}"?`,
        confirmText: 'Eliminar',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.courseService.deleteCourse(course.id)),
      )
      .subscribe({
        next: () => {
          this.courses.update((list) => list.filter((item) => item.id !== course.id));
          this.snackBar.open('Curso eliminado.', 'Cerrar', { duration: 3000 });
        },
        error: () => {
          // errorInterceptor ya notifica el error HTTP al usuario
        },
      });
  }
}
