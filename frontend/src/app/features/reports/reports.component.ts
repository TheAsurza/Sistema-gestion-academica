import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CourseStatus } from '../../core/models/course.model';
import { ReportSummary } from '../../core/models/report.model';
import { UserRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
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
  imports: [DecimalPipe, RoleLabelPipe, CourseStatusPipe, HighlightStatusDirective],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">
            {{ isTeacher ? 'Reportes de Mis Cursos' : 'Reportes Académicos y Operativos' }}
          </h1>
          <p class="text-muted small mb-0">
            {{
              isTeacher
                ? 'Rendimiento académico, aprobados y carga horaria de tus cursos asignados'
                : 'Rendimiento por curso, carga horaria docente y exportación institucional'
            }}
          </p>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-light border btn-sm"
            (click)="loadSummary()"
            [disabled]="loading()"
          >
            <i class="bi bi-arrow-clockwise me-1"></i>Actualizar
          </button>

          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            (click)="exportCsv()"
            [disabled]="!summary()"
          >
            <i class="bi bi-filetype-csv me-1"></i>Exportar CSV
          </button>

          <button
            type="button"
            class="btn btn-ink btn-sm px-3"
            (click)="printReport()"
            [disabled]="!summary()"
          >
            <i class="bi bi-printer me-1"></i>Imprimir / PDF
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="bento-panel p-5 text-center text-muted">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <div>Generando reportes...</div>
        </div>
      } @else if (error()) {
        <div class="bento-panel p-4 d-flex align-items-center justify-content-between gap-3 text-danger">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ error() }}</span>
          </div>
          <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadSummary()">
            Reintentar
          </button>
        </div>
      } @else if (summary(); as data) {
        <!-- 4 Executive Academic & Operational KPIs -->
        <div class="row g-3">
          <div class="col-6 col-xl-3">
            <div class="elevated-card p-3 p-md-4 h-100">
              <div class="text-muted small fw-semibold">Tasa de aprobación</div>
              <div class="fs-2 fw-bold text-success tabular-nums mt-1">
                {{ data.academic_kpis?.approval_rate ?? 0 }}%
              </div>
              <div class="text-muted" style="font-size: 0.72rem;">Sobre cursos finalizados</div>
            </div>
          </div>

          <div class="col-6 col-xl-3">
            <div class="elevated-card p-3 p-md-4 h-100">
              <div class="text-muted small fw-semibold">Promedio institucional</div>
              <div class="fs-2 fw-bold text-primary tabular-nums mt-1">
                @if (data.academic_kpis?.average_grade !== null && data.academic_kpis?.average_grade !== undefined) {
                  {{ data.academic_kpis?.average_grade | number: '1.2-2' }}
                } @else {
                  —
                }
              </div>
              <div class="text-muted" style="font-size: 0.72rem;">Escala vigesimal (0–20)</div>
            </div>
          </div>

          <div class="col-6 col-xl-3">
            <div class="elevated-card p-3 p-md-4 h-100">
              <div class="text-muted small fw-semibold">Horas planificadas</div>
              <div class="fs-2 fw-bold tabular-nums mt-1">
                {{ data.academic_kpis?.total_planned_hours ?? 0 }} h
              </div>
              <div class="text-muted" style="font-size: 0.72rem;">Suma de módulos registrados</div>
            </div>
          </div>

          <div class="col-6 col-xl-3">
            <div class="elevated-card p-3 p-md-4 h-100">
              @if (isTeacher) {
                <div class="text-muted small fw-semibold">Mis cursos asignados</div>
                <div class="fs-2 fw-bold tabular-nums mt-1">
                  {{ data.total_courses }}
                </div>
                <div class="text-muted" style="font-size: 0.72rem;">Total bajo tu cargo</div>
              } @else {
                <div class="text-muted small fw-semibold">Cursos sin docente</div>
                <div
                  class="fs-2 fw-bold tabular-nums mt-1"
                  [class.text-danger]="(data.academic_kpis?.unassigned_courses ?? 0) > 0"
                >
                  {{ data.academic_kpis?.unassigned_courses ?? 0 }}
                </div>
                <div class="text-muted" style="font-size: 0.72rem;">Alerta de asignación</div>
              }
            </div>
          </div>
        </div>

        <!-- Course Performance Analytics -->
        <div class="bento-panel p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 class="h5 fw-bold mb-0">Rendimiento por Curso</h2>
              <div class="text-muted small">Matriculados actuales, nota promedio y tasa de aprobación</div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table glass-table table-hover">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Carrera</th>
                  <th>Docente</th>
                  <th class="text-center">Matriculados</th>
                  <th class="text-center">Promedio</th>
                  <th style="min-width: 170px;">Aprobación</th>
                </tr>
              </thead>
              <tbody>
                @for (row of data.course_performance ?? []; track row.id) {
                  <tr>
                    <td>
                      <div class="fw-bold">{{ row.code }}</div>
                      <div class="small text-muted">{{ row.title }}</div>
                    </td>
                    <td class="small">{{ row.career }}</td>
                    <td class="small">{{ row.teacher_name }}</td>
                    <td class="text-center tabular-nums fw-semibold">{{ row.enrolled_count }}</td>
                    <td class="text-center tabular-nums fw-bold">
                      @if (row.average_grade !== null) {
                        {{ row.average_grade | number: '1.2-2' }}
                      } @else {
                        <span class="text-muted fw-normal">—</span>
                      }
                    </td>
                    <td>
                      @if (row.approval_rate !== null) {
                        <div class="d-flex align-items-center gap-2">
                          <div class="progress flex-grow-1" style="height: 7px;">
                            <div
                              class="progress-bar bg-primary"
                              [style.width.%]="row.approval_rate"
                            ></div>
                          </div>
                          <span class="small fw-semibold tabular-nums">{{ row.approval_rate }}%</span>
                        </div>
                      } @else {
                        <span class="small text-muted fst-italic">Sin cierres</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Teacher Workload + Summary Breakdown -->
        <div class="row g-3">
          @if (!isTeacher) {
            <div class="col-12 col-lg-6">
              <div class="bento-panel p-4 h-100">
                <h2 class="h5 fw-bold mb-3">Carga Horaria Docente</h2>
                <div class="table-responsive">
                  <table class="table glass-table table-hover">
                    <thead>
                      <tr>
                        <th>Profesor</th>
                        <th class="text-center">Cursos</th>
                        <th class="text-center">Clases / Módulos</th>
                        <th class="text-end">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (t of data.teacher_workload ?? []; track t.id) {
                        <tr>
                          <td class="fw-semibold">{{ t.name }}</td>
                          <td class="text-center tabular-nums">{{ t.courses_count }}</td>
                          <td class="text-center tabular-nums">{{ t.modules_count }}</td>
                          <td class="text-end fw-bold tabular-nums">{{ t.total_hours }} h</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          }

          <div [class]="isTeacher ? 'col-12' : 'col-12 col-lg-6 d-flex flex-column gap-3'">
            @if (!isTeacher) {
              <div class="bento-panel p-4">
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
            }

            <div class="bento-panel p-4">
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
  private readonly authService = inject(AuthService);

  readonly isTeacher = this.authService.getCurrentUser()?.role === 'profesor';
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

  exportCsv(): void {
    const rows = this.summary()?.course_performance ?? [];
    if (rows.length === 0) {
      return;
    }

    const header = ['Codigo', 'Curso', 'Carrera', 'Docente', 'Matriculados', 'Promedio', 'Aprobacion (%)'];
    const csvLines = [
      header.join(','),
      ...rows.map((r) =>
        [
          `"${r.code}"`,
          `"${r.title.replace(/"/g, '""')}"`,
          `"${r.career.replace(/"/g, '""')}"`,
          `"${r.teacher_name.replace(/"/g, '""')}"`,
          r.enrolled_count,
          r.average_grade ?? '',
          r.approval_rate ?? '',
        ].join(','),
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.isTeacher ? 'reporte-docente-zegel.csv' : 'reporte-academico-zegel.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  printReport(): void {
    window.print();
  }
}
