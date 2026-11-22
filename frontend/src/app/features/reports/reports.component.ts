import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { CourseStatus } from '../../core/models/course.model';
import { ReportSummary } from '../../core/models/report.model';
import { UserRole } from '../../core/models/user.model';
import { ReportService } from '../../core/services/report.service';
import { HighlightStatusDirective } from '../../shared/directives/highlight-status.directive';
import { CourseStatusPipe } from '../../shared/pipes/course-status.pipe';
import { RoleLabelPipe } from '../../shared/pipes/role-label.pipe';

interface RoleBreakdownRow {
  role: UserRole;
  count: number;
}

interface CourseStatusBreakdownRow {
  status: CourseStatus;
  count: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    RoleLabelPipe,
    CourseStatusPipe,
    HighlightStatusDirective,
  ],
  template: `
    <div class="reports-container">
      <header class="page-header">
        <div>
          <h1>Reportes del Sistema</h1>
          <p class="subtitle">Resumen general de usuarios, cursos y matrículas</p>
        </div>

        <button
          mat-stroked-button
          color="primary"
          type="button"
          [disabled]="loading()"
          (click)="loadSummary()"
        >
          <mat-icon>refresh</mat-icon>
          Actualizar
        </button>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Cargando reportes...</span>
        </div>
      } @else if (error()) {
        <mat-card class="error-card">
          <mat-card-content>
            <p>{{ error() }}</p>
            <button mat-stroked-button color="primary" type="button" (click)="loadSummary()">
              Reintentar
            </button>
          </mat-card-content>
        </mat-card>
      } @else if (summary(); as data) {
        <section class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-header">
                <span class="stat-label">Total de Usuarios</span>
                <mat-icon color="primary">group</mat-icon>
              </div>
              <div class="stat-value">{{ data.total_users }}</div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-header">
                <span class="stat-label">Total de Cursos</span>
                <mat-icon color="primary">menu_book</mat-icon>
              </div>
              <div class="stat-value">{{ data.total_courses }}</div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-header">
                <span class="stat-label">Total de Matrículas</span>
                <mat-icon color="primary">assignment_turned_in</mat-icon>
              </div>
              <div class="stat-value">{{ data.total_enrollments }}</div>
            </mat-card-content>
          </mat-card>
        </section>

        <section class="breakdown-grid">
          <mat-card class="breakdown-card">
            <mat-card-header>
              <mat-card-title>Usuarios por Rol</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <table mat-table [dataSource]="roleBreakdown()" class="breakdown-table">
                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef>Rol</th>
                  <td mat-cell *matCellDef="let row">{{ row.role | roleLabel }}</td>
                </ng-container>

                <ng-container matColumnDef="count">
                  <th mat-header-cell *matHeaderCellDef class="numeric-col">Cantidad</th>
                  <td mat-cell *matCellDef="let row" class="numeric-col">
                    <strong>{{ row.count }}</strong>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="roleColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: roleColumns"></tr>
              </table>
            </mat-card-content>
          </mat-card>

          <mat-card class="breakdown-card">
            <mat-card-header>
              <mat-card-title>Cursos por Estado</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <table mat-table [dataSource]="courseStatusBreakdown()" class="breakdown-table">
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let row">
                    <span [appHighlightStatus]="row.status">
                      {{ row.status | courseStatus }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="count">
                  <th mat-header-cell *matHeaderCellDef class="numeric-col">Cantidad</th>
                  <td mat-cell *matCellDef="let row" class="numeric-col">
                    <strong>{{ row.count }}</strong>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="statusColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: statusColumns"></tr>
              </table>
            </mat-card-content>
          </mat-card>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .reports-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
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

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px 16px;
        color: #616161;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }

      .stat-card,
      .breakdown-card,
      .error-card {
        border-radius: 12px;
      }

      .stat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .stat-label {
        font-size: 13px;
        font-weight: 500;
        color: #616161;
      }

      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #1565c0;
      }

      .breakdown-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
      }

      .breakdown-card mat-card-header {
        margin-bottom: 8px;
      }

      .breakdown-table {
        width: 100%;
      }

      .numeric-col {
        text-align: right;
      }
    `,
  ],
})
export class ReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly summary = signal<ReportSummary | null>(null);

  readonly roleColumns = ['role', 'count'];
  readonly statusColumns = ['status', 'count'];

  readonly roleBreakdown = computed<RoleBreakdownRow[]>(() => {
    const data = this.summary();
    if (!data) {
      return [];
    }
    const roles: UserRole[] = ['admin', 'profesor', 'estudiante'];
    return roles.map((role) => ({
      role,
      count: data.users_by_role?.[role] ?? 0,
    }));
  });

  readonly courseStatusBreakdown = computed<CourseStatusBreakdownRow[]>(() => {
    const data = this.summary();
    if (!data) {
      return [];
    }
    const statuses: CourseStatus[] = ['active', 'draft', 'inactive'];
    return statuses.map((status) => ({
      status,
      count: data.courses_by_status?.[status] ?? 0,
    }));
  });

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportService.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los reportes del sistema.');
        this.loading.set(false);
      },
    });
  }
}
