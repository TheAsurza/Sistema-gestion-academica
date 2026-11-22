import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
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
    MatProgressSpinnerModule,
    RoleLabelPipe,
    CourseStatusPipe,
    HighlightStatusDirective,
  ],
  template: `
    <div class="dashboard-container">
      <header class="page-header">
        <div>
          <h1>Bienvenido, {{ currentUser()?.name }}</h1>
          <p class="subtitle">
            Panel principal &middot; Rol: <strong>{{ currentUser()?.role | roleLabel }}</strong>
          </p>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Cargando resumen...</span>
        </div>
      } @else if (error()) {
        <mat-card class="error-card">
          <mat-card-content>
            <p>{{ error() }}</p>
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
                <div class="stat-header">
                  <span class="stat-label">Total Usuarios</span>
                  <mat-icon color="primary">group</mat-icon>
                </div>
                <div class="stat-value">{{ data.total_users }}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-header">
                  <span class="stat-label">Total Cursos</span>
                  <mat-icon color="primary">menu_book</mat-icon>
                </div>
                <div class="stat-value">{{ data.total_courses }}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-header">
                  <span class="stat-label">Matrículas</span>
                  <mat-icon color="primary">assignment_turned_in</mat-icon>
                </div>
                <div class="stat-value">{{ data.total_enrollments }}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-header">
                  <span class="stat-label">Cursos Activos</span>
                  <mat-icon color="primary">check_circle</mat-icon>
                </div>
                <div class="stat-value">{{ data.courses_by_status.active }}</div>
              </mat-card-content>
            </mat-card>
          </section>

          <mat-card class="quick-links-card">
            <mat-card-header>
              <mat-card-title>Accesos rápidos</mat-card-title>
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
        }

        @if (currentUser()?.role === 'profesor') {
          <section class="stats-grid">
            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-header">
                  <span class="stat-label">Cursos Asignados</span>
                  <mat-icon color="primary">menu_book</mat-icon>
                </div>
                <div class="stat-value">{{ courses().length }}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-header">
                  <span class="stat-label">Cursos Activos</span>
                  <mat-icon color="primary">play_circle</mat-icon>
                </div>
                <div class="stat-value">{{ activeCourses().length }}</div>
              </mat-card-content>
            </mat-card>
          </section>

          <mat-card class="list-card">
            <mat-card-header>
              <mat-card-title>Cursos Activos Asignados</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (activeCourses().length === 0) {
                <p class="empty-text">No tienes cursos activos asignados actualmente.</p>
              } @else {
                <mat-list>
                  @for (course of activeCourses(); track course.id) {
                    <mat-list-item>
                      <mat-icon matListItemIcon>book</mat-icon>
                      <span matListItemTitle>{{ course.code }} - {{ course.title }}</span>
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
                <div class="stat-header">
                  <span class="stat-label">Cursos Activos</span>
                  <mat-icon color="primary">menu_book</mat-icon>
                </div>
                <div class="stat-value">{{ activeCourses().length }}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-header">
                  <span class="stat-label">Cursos Completados</span>
                  <mat-icon color="primary">task_alt</mat-icon>
                </div>
                <div class="stat-value">{{ completedHistoryCount() }}</div>
              </mat-card-content>
            </mat-card>

            <mat-card class="stat-card">
              <mat-card-content>
                <div class="stat-header">
                  <span class="stat-label">Promedio General</span>
                  <mat-icon color="primary">grade</mat-icon>
                </div>
                <div class="stat-value">
                  @if (averageGrade() !== null) {
                    {{ averageGrade() | number: '1.2-2' }}
                  } @else {
                    —
                  }
                </div>
              </mat-card-content>
            </mat-card>
          </section>

          <mat-card class="quick-links-card">
            <mat-card-header>
              <mat-card-title>Accesos rápidos</mat-card-title>
            </mat-card-header>
            <mat-card-content class="quick-links">
              <a mat-flat-button color="primary" routerLink="/courses">
                <mat-icon>menu_book</mat-icon>
                Explorar Cursos
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
        gap: 12px;
        padding: 32px;
        justify-content: center;
        color: #616161;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
      }

      .stat-card {
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

      .quick-links-card,
      .list-card,
      .error-card {
        border-radius: 12px;
      }

      .quick-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        padding-top: 12px;
      }

      .quick-links a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .empty-text {
        color: #757575;
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
