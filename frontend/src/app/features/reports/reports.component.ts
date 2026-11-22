import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  imports: [RoleLabelPipe, CourseStatusPipe, HighlightStatusDirective],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Reportes del Sistema</h1>
          <p class="text-muted small mb-0">Resumen estadístico de usuarios, cursos y matrículas</p>
        </div>

        <button
          type="button"
          class="btn btn-outline-primary bg-white bg-opacity-50 btn-sm"
          (click)="loadSummary()"
          [disabled]="loading()"
        >
          <i class="bi bi-arrow-clockwise me-1"></i>Actualizar
        </button>
      </header>

      @if (loading()) {
        <div class="glass-card p-5 text-center text-muted">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <div>Cargando estadísticas...</div>
        </div>
      } @else if (error()) {
        <div class="glass-card p-4 d-flex align-items-center justify-content-between gap-3 text-danger">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ error() }}</span>
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" (click)="loadSummary()">
            Reintentar
          </button>
        </div>
      } @else if (summary(); as data) {
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <div class="glass-card p-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="text-muted small fw-semibold">Total Usuarios</div>
                  <div class="fs-2 fw-bold text-primary tabular-nums mt-1">{{ data.total_users }}</div>
                </div>
                <i class="bi bi-people-fill fs-2 text-primary opacity-75"></i>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="glass-card p-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="text-muted small fw-semibold">Total Cursos</div>
                  <div class="fs-2 fw-bold text-primary tabular-nums mt-1">{{ data.total_courses }}</div>
                </div>
                <i class="bi bi-journal-bookmark-fill fs-2 text-primary opacity-75"></i>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="glass-card p-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="text-muted small fw-semibold">Total Matrículas</div>
                  <div class="fs-2 fw-bold text-primary tabular-nums mt-1">{{ data.total_enrollments }}</div>
                </div>
                <i class="bi bi-clipboard2-check-fill fs-2 text-primary opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-12 col-lg-6">
            <div class="glass-card p-4 h-100">
              <h2 class="h5 fw-bold mb-3">Usuarios por Rol</h2>
              <div class="table-responsive">
                <table class="table glass-table table-hover">
                  <thead>
                    <tr>
                      <th>Rol</th>
                      <th class="text-end">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of roleRows(); track row.role) {
                      <tr>
                        <td>{{ row.role | roleLabel }}</td>
                        <td class="text-end fw-bold tabular-nums">{{ row.count }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-12 col-lg-6">
            <div class="glass-card p-4 h-100">
              <h2 class="h5 fw-bold mb-3">Cursos por Estado</h2>
              <div class="table-responsive">
                <table class="table glass-table table-hover">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th class="text-end">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of courseStatusRows(); track row.status) {
                      <tr>
                        <td>
                          <span [appHighlightStatus]="row.status">{{ row.status | courseStatus }}</span>
                        </td>
                        <td class="text-end fw-bold tabular-nums">{{ row.count }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  readonly summary = signal<ReportSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly roleRows = computed<RoleBreakdownRow[]>(() => {
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

  readonly courseStatusRows = computed<CourseStatusBreakdownRow[]>(() => {
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
