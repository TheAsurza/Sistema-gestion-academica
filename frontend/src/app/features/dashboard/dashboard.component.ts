import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Course } from '../../core/models/course.model';
import { EnrollmentHistory } from '../../core/models/enrollment.model';
import { ReportSummary } from '../../core/models/report.model';
import { AuthService } from '../../core/services/auth.service';
import { CourseService } from '../../core/services/course.service';
import { ReportService } from '../../core/services/report.service';
import { HighlightStatusDirective } from '../../shared/directives/highlight-status.directive';
import { CourseStatusPipe } from '../../shared/pipes/course-status.pipe';
import { RoleLabelPipe } from '../../shared/pipes/role-label.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, RouterLink, RoleLabelPipe, CourseStatusPipe, HighlightStatusDirective],
  template: `
    <div class="d-flex flex-column gap-4">
      <section class="welcome-banner">
        <div>
          <span class="role-pill">{{ currentUser()?.role | roleLabel }}</span>
          <h1 class="h3 fw-bold mb-1">Bienvenido, {{ currentUser()?.name }}</h1>
          <p class="mb-0 text-white-50 small">
            Resumen en tiempo real de tu actividad y accesos principales en Zegel LMS.
          </p>
        </div>
        <a class="btn btn-light fw-semibold px-3" routerLink="/courses">
          <i class="bi bi-journal-bookmark-fill me-2 text-primary"></i>Ir a Cursos
        </a>
      </section>

      @if (loading()) {
        <div class="glass-card p-5 text-center text-muted">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <div>Cargando resumen...</div>
        </div>
      } @else if (error()) {
        <div class="glass-card p-4 d-flex align-items-center justify-content-between gap-3 text-danger">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ error() }}</span>
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" (click)="loadDashboardData()">
            Reintentar
          </button>
        </div>
      } @else {
        @if (currentUser()?.role === 'admin' && summary(); as data) {
          <div class="row g-3">
            <div class="col-12 col-sm-6 col-xl-3">
              <div class="glass-card p-3 p-md-4 stat-card h-100">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Total Usuarios</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ data.total_users }}</div>
                  </div>
                  <div class="stat-icon tone-blue"><i class="bi bi-people-fill"></i></div>
                </div>
              </div>
            </div>

            <div class="col-12 col-sm-6 col-xl-3">
              <div class="glass-card p-3 p-md-4 stat-card h-100">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Total Cursos</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ data.total_courses }}</div>
                  </div>
                  <div class="stat-icon tone-indigo"><i class="bi bi-journal-bookmark-fill"></i></div>
                </div>
              </div>
            </div>

            <div class="col-12 col-sm-6 col-xl-3">
              <div class="glass-card p-3 p-md-4 stat-card h-100">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Matrículas</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ data.total_enrollments }}</div>
                  </div>
                  <div class="stat-icon tone-amber"><i class="bi bi-clipboard2-check-fill"></i></div>
                </div>
              </div>
            </div>

            <div class="col-12 col-sm-6 col-xl-3">
              <div class="glass-card p-3 p-md-4 stat-card h-100">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Cursos Activos</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ data.courses_by_status.active }}</div>
                  </div>
                  <div class="stat-icon tone-green"><i class="bi bi-check-circle-fill"></i></div>
                </div>
              </div>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-12 col-lg-6">
              <div class="glass-card p-4 h-100">
                <h2 class="h5 fw-bold mb-1">Distribución de Cursos</h2>
                <p class="text-muted small mb-3">Estado actual del catálogo académico</p>

                <div class="d-flex flex-column gap-3">
                  <div>
                    <div class="d-flex justify-content-between small mb-1">
                      <span>Activos</span>
                      <strong class="tabular-nums">{{ data.courses_by_status.active }} / {{ data.total_courses }}</strong>
                    </div>
                    <div class="progress" style="height: 8px;">
                      <div
                        class="progress-bar bg-success"
                        [style.width.%]="percent(data.courses_by_status.active, data.total_courses)"
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div class="d-flex justify-content-between small mb-1">
                      <span>Borradores</span>
                      <strong class="tabular-nums">{{ data.courses_by_status.draft }} / {{ data.total_courses }}</strong>
                    </div>
                    <div class="progress" style="height: 8px;">
                      <div
                        class="progress-bar bg-warning"
                        [style.width.%]="percent(data.courses_by_status.draft, data.total_courses)"
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div class="d-flex justify-content-between small mb-1">
                      <span>Inactivos</span>
                      <strong class="tabular-nums">{{ data.courses_by_status.inactive }} / {{ data.total_courses }}</strong>
                    </div>
                    <div class="progress" style="height: 8px;">
                      <div
                        class="progress-bar bg-secondary"
                        [style.width.%]="percent(data.courses_by_status.inactive, data.total_courses)"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-6">
              <div class="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <h2 class="h5 fw-bold mb-1">Accesos rápidos</h2>
                  <p class="text-muted small mb-3">Módulos administrativos del sistema</p>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <a class="btn btn-primary" routerLink="/courses">
                    <i class="bi bi-journal-bookmark-fill me-2"></i>Gestionar Cursos
                  </a>
                  <a class="btn btn-outline-primary bg-white bg-opacity-50" routerLink="/users">
                    <i class="bi bi-people-fill me-2"></i>Gestionar Usuarios
                  </a>
                  <a class="btn btn-outline-primary bg-white bg-opacity-50" routerLink="/reports">
                    <i class="bi bi-bar-chart-fill me-2"></i>Ver Reportes
                  </a>
                </div>
              </div>
            </div>
          </div>
        }

        @if (currentUser()?.role === 'profesor') {
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <div class="glass-card p-4 stat-card">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Cursos Asignados</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ courses().length }}</div>
                  </div>
                  <div class="stat-icon tone-blue"><i class="bi bi-journal-bookmark-fill"></i></div>
                </div>
              </div>
            </div>

            <div class="col-12 col-md-6">
              <div class="glass-card p-4 stat-card">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Cursos Activos</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ activeCourses().length }}</div>
                  </div>
                  <div class="stat-icon tone-green"><i class="bi bi-play-circle-fill"></i></div>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-card p-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h2 class="h5 fw-bold mb-0">Cursos Activos Asignados</h2>
                <div class="text-muted small">Acceso directo para actualizar temarios y módulos</div>
              </div>
              <a class="btn btn-outline-primary btn-sm" routerLink="/courses">Ver todos</a>
            </div>

            @if (activeCourses().length === 0) {
              <p class="text-muted mb-0">No tienes cursos activos asignados actualmente.</p>
            } @else {
              <div class="list-group list-group-flush bg-transparent">
                @for (course of activeCourses(); track course.id) {
                  <div class="list-group-item bg-transparent d-flex justify-content-between align-items-center px-0">
                    <div>
                      <div class="fw-semibold">{{ course.code }} — {{ course.title }}</div>
                      <div class="text-muted small">
                        {{ course.credits }} créditos &middot; {{ course.modules.length }} módulos
                      </div>
                    </div>
                    <span [appHighlightStatus]="course.status">{{ course.status | courseStatus }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (currentUser()?.role === 'estudiante') {
          <div class="row g-3">
            <div class="col-12 col-md-4">
              <div class="glass-card p-4 stat-card h-100">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Cursos Activos</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ activeCourses().length }}</div>
                  </div>
                  <div class="stat-icon tone-blue"><i class="bi bi-journal-bookmark-fill"></i></div>
                </div>
              </div>
            </div>

            <div class="col-12 col-md-4">
              <div class="glass-card p-4 stat-card h-100">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Cursos Completados</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">{{ completedHistoryCount() }}</div>
                  </div>
                  <div class="stat-icon tone-green"><i class="bi bi-check2-all"></i></div>
                </div>
              </div>
            </div>

            <div class="col-12 col-md-4">
              <div class="glass-card p-4 stat-card h-100">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <div class="text-muted small fw-semibold">Promedio General</div>
                    <div class="fs-2 fw-bold tabular-nums mt-1">
                      @if (averageGrade() !== null) {
                        {{ averageGrade() | number: '1.2-2' }}
                      } @else {
                        —
                      }
                    </div>
                  </div>
                  <div class="stat-icon tone-amber"><i class="bi bi-award-fill"></i></div>
                </div>
              </div>
            </div>
          </div>

          <div class="glass-card p-4">
            <h2 class="h5 fw-bold mb-1">Accesos rápidos</h2>
            <p class="text-muted small mb-3">Consulta tus cursos matriculados y notas históricas</p>
            <div class="d-flex flex-wrap gap-2">
              <a class="btn btn-primary" routerLink="/courses">
                <i class="bi bi-journal-bookmark-fill me-2"></i>Explorar Cursos Activos
              </a>
              <a class="btn btn-outline-primary bg-white bg-opacity-50" routerLink="/courses/history">
                <i class="bi bi-award-fill me-2"></i>Ver Historial de Notas
              </a>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .welcome-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.25rem;
        flex-wrap: wrap;
        padding: 1.75rem 2rem;
        border-radius: var(--zegel-radius);
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        color: #ffffff;
        box-shadow: 0 12px 28px rgba(37, 99, 235, 0.24);
      }

      .role-pill {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.2);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 0.5rem;
      }

      .stat-card {
        transition: transform 180ms ease, box-shadow 180ms ease;
      }

      .stat-card:hover {
        transform: translateY(-2px);
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.35rem;
        flex-shrink: 0;
      }

      .tone-blue {
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary);
      }

      .tone-indigo {
        background: var(--zegel-indigo-soft);
        color: var(--zegel-indigo);
      }

      .tone-amber {
        background: var(--zegel-warning-soft);
        color: var(--zegel-warning);
      }

      .tone-green {
        background: var(--zegel-success-soft);
        color: var(--zegel-success);
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reportService = inject(ReportService);
  private readonly courseService = inject(CourseService);

  readonly currentUser = signal(this.authService.getCurrentUser());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly summary = signal<ReportSummary | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly history = signal<EnrollmentHistory[]>([]);

  readonly activeCourses = computed(() =>
    this.courses().filter((course) => course.status === 'active'),
  );

  readonly completedHistoryCount = computed(
    () => this.history().filter((item) => item.status === 'completed').length,
  );

  readonly averageGrade = computed(() => {
    const graded = this.history().filter((item) => item.final_grade !== null);
    if (graded.length === 0) {
      return null;
    }
    const sum = graded.reduce((acc, item) => acc + (item.final_grade ?? 0), 0);
    return sum / graded.length;
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  percent(part: number, total: number): number {
    if (!total) {
      return 0;
    }
    return Math.round((part / total) * 100);
  }

  loadDashboardData(): void {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);

    if (!user) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    if (user.role === 'admin') {
      this.reportService.getSummary().subscribe({
        next: (data) => {
          this.summary.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el resumen administrativo.');
          this.loading.set(false);
        },
      });
      return;
    }

    if (user.role === 'profesor') {
      this.courseService.getCourses().subscribe({
        next: (courses) => {
          this.courses.set(courses);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los cursos asignados.');
          this.loading.set(false);
        },
      });
      return;
    }

    forkJoin({
      courses: this.courseService.getCourses(),
      history: this.courseService.getStudentHistory(),
    }).subscribe({
      next: ({ courses, history }) => {
        this.courses.set(courses);
        this.history.set(history);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar tu resumen académico.');
        this.loading.set(false);
      },
    });
  }
}
