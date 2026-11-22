import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
  imports: [
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RoleLabelPipe,
    CourseStatusPipe,
    HighlightStatusDirective,
  ],
  template: `
    <div class="dashboard-container">
      <section class="welcome-banner">
        <div class="welcome-copy">
          <span class="role-pill">{{ currentUser()?.role | roleLabel }}</span>
          <h1>Bienvenido, {{ currentUser()?.name }}</h1>
          <p>Resumen en tiempo real de tu actividad y accesos principales en Zegel LMS.</p>
        </div>
        <div class="welcome-actions">
          <a mat-flat-button color="primary" routerLink="/courses" class="banner-cta">
            <mat-icon>menu_book</mat-icon>
            Ir a Cursos
          </a>
        </div>
      </section>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Cargando resumen...</span>
        </div>
      } @else if (error()) {
        <mat-card class="error-card">
          <mat-card-content class="error-content">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error() }}</span>
            <button mat-stroked-button color="primary" type="button" (click)="loadDashboardData()">
              Reintentar
            </button>
          </mat-card-content>
        </mat-card>
      } @else {
        @if (currentUser()?.role === 'admin' && summary(); as data) {
          <section class="stats-grid">
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Total Usuarios</span>
                    <div class="stat-value tabular-nums">{{ data.total_users }}</div>
                  </div>
                  <div class="stat-icon tone-blue">
                    <mat-icon>group</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Total Cursos</span>
                    <div class="stat-value tabular-nums">{{ data.total_courses }}</div>
                  </div>
                  <div class="stat-icon tone-indigo">
                    <mat-icon>menu_book</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Matrículas</span>
                    <div class="stat-value tabular-nums">{{ data.total_enrollments }}</div>
                  </div>
                  <div class="stat-icon tone-amber">
                    <mat-icon>assignment_turned_in</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Cursos Activos</span>
                    <div class="stat-value tabular-nums">{{ data.courses_by_status.active }}</div>
                  </div>
                  <div class="stat-icon tone-green">
                    <mat-icon>check_circle</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </section>

          <div class="two-col-grid">
            <mat-card class="panel-card">
              <mat-card-header>
                <mat-card-title>Distribución de Cursos</mat-card-title>
                <mat-card-subtitle>Estado actual del catálogo académico</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content class="progress-stack">
                <div class="progress-item">
                  <div class="progress-meta">
                    <span>Activos</span>
                    <strong class="tabular-nums">{{ data.courses_by_status.active }} / {{ data.total_courses }}</strong>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="percent(data.courses_by_status.active, data.total_courses)"
                  ></mat-progress-bar>
                </div>
                <div class="progress-item">
                  <div class="progress-meta">
                    <span>Borradores</span>
                    <strong class="tabular-nums">{{ data.courses_by_status.draft }} / {{ data.total_courses }}</strong>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="percent(data.courses_by_status.draft, data.total_courses)"
                  ></mat-progress-bar>
                </div>
                <div class="progress-item">
                  <div class="progress-meta">
                    <span>Inactivos</span>
                    <strong class="tabular-nums">{{ data.courses_by_status.inactive }} / {{ data.total_courses }}</strong>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="percent(data.courses_by_status.inactive, data.total_courses)"
                  ></mat-progress-bar>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="panel-card">
              <mat-card-header>
                <mat-card-title>Accesos rápidos</mat-card-title>
                <mat-card-subtitle>Módulos administrativos</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content class="quick-links">
                <a mat-flat-button color="primary" routerLink="/courses">
                  <mat-icon>menu_book</mat-icon>
                  Gestionar Cursos
                </a>
                <a mat-stroked-button color="primary" routerLink="/users">
                  <mat-icon>group</mat-icon>
                  Gestionar Usuarios
                </a>
                <a mat-stroked-button color="primary" routerLink="/reports">
                  <mat-icon>bar_chart</mat-icon>
                  Ver Reportes
                </a>
              </mat-card-content>
            </mat-card>
          </div>
        }

        @if (currentUser()?.role === 'profesor') {
          <section class="stats-grid">
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Cursos Asignados</span>
                    <div class="stat-value tabular-nums">{{ courses().length }}</div>
                  </div>
                  <div class="stat-icon tone-blue">
                    <mat-icon>menu_book</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Cursos Activos</span>
                    <div class="stat-value tabular-nums">{{ activeCourses().length }}</div>
                  </div>
                  <div class="stat-icon tone-green">
                    <mat-icon>play_circle</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </section>

          <mat-card class="panel-card">
            <mat-card-header>
              <mat-card-title>Cursos Activos Asignados</mat-card-title>
              <mat-card-subtitle>Acceso directo para actualizar temarios y módulos</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (activeCourses().length === 0) {
                <p class="empty-text">No tienes cursos activos asignados actualmente.</p>
              } @else {
                <mat-list>
                  @for (course of activeCourses(); track course.id) {
                    <mat-list-item>
                      <mat-icon matListItemIcon>book</mat-icon>
                      <span matListItemTitle>{{ course.code }} — {{ course.title }}</span>
                      <span matListItemLine>
                        {{ course.credits }} créditos &middot; {{ course.modules.length }} módulos
                      </span>
                      <span matListItemMeta [appHighlightStatus]="course.status">
                        {{ course.status | courseStatus }}
                      </span>
                    </mat-list-item>
                  }
                </mat-list>
              }
            </mat-card-content>
            <mat-card-actions align="end">
              <a mat-button color="primary" routerLink="/courses">Ver todos los cursos</a>
            </mat-card-actions>
          </mat-card>
        }

        @if (currentUser()?.role === 'estudiante') {
          <section class="stats-grid">
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Cursos Activos</span>
                    <div class="stat-value tabular-nums">{{ activeCourses().length }}</div>
                  </div>
                  <div class="stat-icon tone-blue">
                    <mat-icon>menu_book</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Cursos Completados</span>
                    <div class="stat-value tabular-nums">{{ completedHistoryCount() }}</div>
                  </div>
                  <div class="stat-icon tone-green">
                    <mat-icon>task_alt</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-row">
                  <div>
                    <span class="stat-label">Promedio General</span>
                    <div class="stat-value tabular-nums">
                      @if (averageGrade() !== null) {
                        {{ averageGrade() | number: '1.2-2' }}
                      } @else {
                        —
                      }
                    </div>
                  </div>
                  <div class="stat-icon tone-amber">
                    <mat-icon>grade</mat-icon>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </section>

          <mat-card class="panel-card">
            <mat-card-header>
              <mat-card-title>Accesos rápidos</mat-card-title>
              <mat-card-subtitle>Consulta tus cursos matriculados y notas históricas</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="quick-links">
              <a mat-flat-button color="primary" routerLink="/courses">
                <mat-icon>menu_book</mat-icon>
                Explorar Cursos Activos
              </a>
              <a mat-stroked-button color="primary" routerLink="/courses/history">
                <mat-icon>grade</mat-icon>
                Ver Historial de Notas
              </a>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .welcome-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        padding: 26px 30px;
        border-radius: var(--zegel-radius);
        border: 3px solid var(--zegel-primary-border);
        background: var(--zegel-hero-bg);
        color: var(--zegel-hero-text);
        box-shadow: var(--zegel-clay-shadow);
      }

      .role-pill {
        display: inline-block;
        padding: 4px 12px;
        border-radius: var(--zegel-radius-pill);
        background: rgba(255, 255, 255, 0.22);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 8px;
      }

      .welcome-copy h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }

      .welcome-copy p {
        margin: 6px 0 0;
        font-size: 14px;
        color: var(--zegel-hero-muted);
      }

      .banner-cta {
        background-color: var(--zegel-surface) !important;
        color: var(--zegel-primary-dark) !important;
        font-weight: 700 !important;
        border: 2px solid var(--zegel-primary-border) !important;
        box-shadow: var(--zegel-clay-shadow-sm);
      }

      .loading-state {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 40px;
        justify-content: center;
        color: var(--zegel-muted);
      }

      .error-content {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--zegel-error);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }

      .stat-card {
        transition: transform 180ms ease, box-shadow 180ms ease;
      }

      .stat-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--zegel-clay-shadow-hover) !important;
      }

      .stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .stat-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--zegel-muted);
      }

      .stat-value {
        margin-top: 6px;
        font-size: 30px;
        font-weight: 700;
        color: var(--zegel-text);
        line-height: 1.1;
      }

      .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: var(--zegel-clay-shadow-sm);
      }

      .tone-blue {
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary);
        border: 2px solid var(--zegel-primary-border);
      }

      .tone-indigo {
        background: var(--zegel-indigo-soft);
        color: var(--zegel-indigo);
        border: 2px solid var(--zegel-indigo-border);
      }

      .tone-amber {
        background: var(--zegel-warning-soft);
        color: var(--zegel-warning);
        border: 2px solid var(--zegel-warning-border);
      }

      .tone-green {
        background: var(--zegel-success-soft);
        color: var(--zegel-success);
        border: 2px solid var(--zegel-success-border);
      }

      .two-col-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
      }

      .progress-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding-top: 12px !important;
      }

      .progress-meta {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 6px;
        color: var(--zegel-text);
      }

      .quick-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        padding-top: 14px !important;
      }

      .quick-links a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 10px !important;
      }

      .empty-text {
        color: var(--zegel-muted);
        margin: 12px 0;
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
