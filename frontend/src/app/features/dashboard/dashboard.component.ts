import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Course } from '../../core/models/course.model';
import {
  AgendaEvent,
  NoticeItem,
  WeeklyAttendance,
} from '../../core/models/dashboard-widgets.model';
import { EnrollmentHistory } from '../../core/models/enrollment.model';
import { ReportSummary } from '../../core/models/report.model';
import { AuthService } from '../../core/services/auth.service';
import { CourseService } from '../../core/services/course.service';
import { DashboardWidgetService } from '../../core/services/dashboard-widget.service';
import { ReportService } from '../../core/services/report.service';
import { HighlightStatusDirective } from '../../shared/directives/highlight-status.directive';
import { CourseStatusPipe } from '../../shared/pipes/course-status.pipe';
import { RoleLabelPipe } from '../../shared/pipes/role-label.pipe';

interface WeekDayCell {
  label: string;
  dayNumber: number;
  isToday: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    RoleLabelPipe,
    CourseStatusPipe,
    HighlightStatusDirective,
  ],
  template: `
    <div class="d-flex flex-column gap-4">
      @if (loading()) {
        <div class="bento-panel p-5 text-center text-muted">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <div>Cargando panel principal...</div>
        </div>
      } @else if (error()) {
        <div class="bento-panel p-4 d-flex align-items-center justify-content-between gap-3 text-danger">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill"></i>
            <span>{{ error() }}</span>
          </div>
          <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadDashboardData()">
            Reintentar
          </button>
        </div>
      } @else {
        <div class="row g-4 align-items-start">
          <!-- Left / Main Dashboard Column -->
          <div class="col-12 col-xl-8 d-flex flex-column gap-4">
            <!-- Greeting Header -->
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h1 class="h2 fw-bold mb-1 greeting-title">Hola, {{ firstName() }}!</h1>
                <p class="text-muted small mb-0">
                  Panel de <strong>{{ currentUser()?.role | roleLabel }}</strong> &middot;
                  Resumen actualizado de tu actividad académica.
                </p>
              </div>
              <div class="d-flex gap-2">
                <a class="btn btn-ink btn-sm px-3" routerLink="/courses">
                  <i class="bi bi-journal-bookmark-fill me-1"></i>Ir a Cursos
                </a>
                @if (currentUser()?.role === 'admin') {
                  <a class="btn btn-light border btn-sm px-3" routerLink="/teachers">
                    Ver Profesores
                  </a>
                }
              </div>
            </div>

            <!-- Role KPI Cards -->
            @if (currentUser()?.role === 'admin' && summary(); as data) {
              <div class="row g-3">
                <div class="col-6 col-md-3">
                  <div class="elevated-card p-3 h-100">
                    <div class="tile-icon tone-violet mb-3"><i class="bi bi-people-fill"></i></div>
                    <div class="fs-3 fw-bold tabular-nums">{{ data.total_users }}</div>
                    <div class="small fw-semibold">Usuarios totales</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="elevated-card p-3 h-100">
                    <div class="tile-icon tone-mint mb-3"><i class="bi bi-mortarboard-fill"></i></div>
                    <div class="fs-3 fw-bold tabular-nums">{{ data.users_by_role.estudiante }}</div>
                    <div class="small fw-semibold">Alumnos</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="elevated-card p-3 h-100">
                    <div class="tile-icon tone-amber mb-3"><i class="bi bi-person-workspace"></i></div>
                    <div class="fs-3 fw-bold tabular-nums">{{ data.users_by_role.profesor }}</div>
                    <div class="small fw-semibold">Profesores</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="elevated-card p-3 h-100">
                    <div class="tile-icon tone-sky mb-3"><i class="bi bi-shield-check"></i></div>
                    <div class="fs-3 fw-bold tabular-nums">{{ data.users_by_role.admin }}</div>
                    <div class="small fw-semibold">Personal administrativo</div>
                  </div>
                </div>
              </div>
            } @else if (currentUser()?.role === 'profesor') {
              <div class="row g-3">
                <div class="col-6">
                  <div class="elevated-card p-3 p-md-4 h-100 d-flex justify-content-between align-items-center">
                    <div>
                      <div class="small text-muted fw-semibold">Cursos Asignados</div>
                      <div class="fs-2 fw-bold tabular-nums mt-1">{{ courses().length }}</div>
                    </div>
                    <div class="tile-icon tone-violet"><i class="bi bi-journal-bookmark-fill"></i></div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="elevated-card p-3 p-md-4 h-100 d-flex justify-content-between align-items-center">
                    <div>
                      <div class="small text-muted fw-semibold">Cursos Activos</div>
                      <div class="fs-2 fw-bold tabular-nums mt-1">{{ activeCourses().length }}</div>
                    </div>
                    <div class="tile-icon tone-mint"><i class="bi bi-play-circle-fill"></i></div>
                  </div>
                </div>
              </div>
            } @else if (currentUser()?.role === 'estudiante') {
              <div class="row g-3">
                <div class="col-4">
                  <div class="elevated-card p-3 h-100">
                    <div class="tile-icon tone-violet mb-2"><i class="bi bi-journal-bookmark-fill"></i></div>
                    <div class="fs-3 fw-bold tabular-nums">{{ activeCourses().length }}</div>
                    <div class="small fw-semibold">Cursos Activos</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="elevated-card p-3 h-100">
                    <div class="tile-icon tone-mint mb-2"><i class="bi bi-check2-all"></i></div>
                    <div class="fs-3 fw-bold tabular-nums">{{ completedHistoryCount() }}</div>
                    <div class="small fw-semibold">Completados</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="elevated-card p-3 h-100">
                    <div class="tile-icon tone-amber mb-2"><i class="bi bi-award-fill"></i></div>
                    <div class="fs-3 fw-bold tabular-nums">
                      @if (averageGrade() !== null) {
                        {{ averageGrade() | number: '1.2-2' }}
                      } @else {
                        —
                      }
                    </div>
                    <div class="small fw-semibold">Promedio</div>
                  </div>
                </div>
              </div>
            }

            <!-- Attendance Widget (Admin & Profesor) -->
            @if (currentUser()?.role === 'admin' || currentUser()?.role === 'profesor') {
              <section class="bento-panel p-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <h2 class="h5 fw-bold mb-0">Asistencia de Alumnos</h2>
                    <div class="small text-muted">Resumen semanal de asistencia</div>
                  </div>
                  <div class="d-flex align-items-center gap-3 small">
                    <span class="d-inline-flex align-items-center gap-1">
                      <span class="legend-dot dot-violet"></span> Presentes
                    </span>
                    <span class="d-inline-flex align-items-center gap-1">
                      <span class="legend-dot dot-amber"></span> Ausentes
                    </span>
                  </div>
                </div>

                @if (attendance().length === 0) {
                  <p class="text-muted small mb-0">Sin datos de asistencia registrados.</p>
                } @else {
                  <div class="attendance-chart">
                    @for (day of attendance(); track day.id) {
                      <div class="attendance-col">
                        <div class="bars-pair" [title]="day.day_label + ': ' + day.present_pct + '% presentes'">
                          <div class="bar-track">
                            <div
                              class="bar-fill bar-present"
                              [style.height.%]="day.present_pct"
                            >
                              <span class="bar-pct">{{ day.present_pct }}%</span>
                            </div>
                          </div>
                          <div class="bar-track">
                            <div
                              class="bar-fill bar-absent"
                              [style.height.%]="day.absent_pct"
                            ></div>
                          </div>
                        </div>
                        <span class="small fw-semibold text-muted mt-2">{{ day.day_label }}</span>
                      </div>
                    }
                  </div>
                }
              </section>
            }

            <!-- Student Active Courses (Estudiante) -->
            @if (currentUser()?.role === 'estudiante') {
              <section class="bento-panel p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h2 class="h5 fw-bold mb-0">Tus Cursos Activos</h2>
                  <a routerLink="/courses/history" class="small fw-semibold text-decoration-none text-primary">
                    Ver historial de notas <i class="bi bi-arrow-right"></i>
                  </a>
                </div>
                @if (activeCourses().length === 0) {
                  <p class="text-muted small mb-0">No tienes cursos activos matriculados.</p>
                } @else {
                  <div class="d-flex flex-column gap-2">
                    @for (course of activeCourses(); track course.id) {
                      <div class="elevated-card p-3 d-flex justify-content-between align-items-center gap-2">
                        <div>
                          <div class="fw-bold">{{ course.code }} — {{ course.title }}</div>
                          <div class="text-muted small">{{ course.teacher_name || 'Docente por asignar' }}</div>
                        </div>
                        <span class="badge rounded-pill text-bg-light border">{{ course.credits }} créd.</span>
                      </div>
                    }
                  </div>
                }
              </section>
            }

            <!-- Profesor Active Courses -->
            @if (currentUser()?.role === 'profesor') {
              <section class="bento-panel p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h2 class="h5 fw-bold mb-0">Cursos Activos Asignados</h2>
                  <a routerLink="/courses" class="small fw-semibold text-decoration-none text-primary">
                    Editar temarios <i class="bi bi-arrow-right"></i>
                  </a>
                </div>
                @if (activeCourses().length === 0) {
                  <p class="text-muted small mb-0">No tienes cursos activos asignados.</p>
                } @else {
                  <div class="d-flex flex-column gap-2">
                    @for (course of activeCourses(); track course.id) {
                      <div class="elevated-card p-3 d-flex justify-content-between align-items-center gap-2">
                        <div>
                          <div class="fw-bold">{{ course.code }} — {{ course.title }}</div>
                          <div class="text-muted small">{{ course.modules.length }} módulos</div>
                        </div>
                        <span [appHighlightStatus]="course.status">{{ course.status | courseStatus }}</span>
                      </div>
                    }
                  </div>
                }
              </section>
            }

            <!-- Institutional Notice Board Widget (All Roles) -->
            <section class="bento-panel p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h2 class="h5 fw-bold mb-0">Noticias y Publicaciones</h2>
                  <div class="small text-muted">Comunicados oficiales de la institución</div>
                </div>
                <span class="badge rounded-pill text-bg-light border">{{ notices().length }} avisos</span>
              </div>

              @if (notices().length === 0) {
                <p class="text-muted small mb-0">No hay publicaciones recientes.</p>
              } @else {
                <div class="d-flex flex-column gap-2">
                  @for (notice of notices(); track notice.id) {
                    <article class="elevated-card p-3 d-flex justify-content-between align-items-start gap-3 flex-wrap">
                      <div class="d-flex align-items-start gap-3 flex-grow-1">
                        <div class="notice-icon"><i class="bi bi-megaphone-fill"></i></div>
                        <div>
                          <div class="fw-bold small">{{ notice.title }}</div>
                          <div class="text-muted small">{{ notice.summary }}</div>
                          <div class="text-muted mt-1" style="font-size: 0.72rem;">
                            Por {{ notice.author }}
                          </div>
                        </div>
                      </div>
                      <div class="text-end">
                        <span class="notice-tag">{{ notice.category }}</span>
                        <div class="text-muted mt-1" style="font-size: 0.72rem;">
                          {{ notice.published_at | date: 'dd/MM/yyyy' }}
                        </div>
                      </div>
                    </article>
                  }
                </div>
              }
            </section>
          </div>

          <!-- Right Column: Weekly Calendar + 3 Upcoming Agenda Activities -->
          <div class="col-12 col-xl-4 d-flex flex-column gap-4">
            <section class="bento-panel p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h6 fw-bold mb-0 text-capitalize">{{ currentMonthLabel() }}</h2>
                <span class="small text-muted fw-semibold">Semana actual</span>
              </div>

              <div class="week-strip mb-4">
                @for (day of weekDays(); track day.dayNumber) {
                  <div class="week-day-cell" [class.today]="day.isToday">
                    <span class="week-day-label">{{ day.label }}</span>
                    <span class="week-day-num tabular-nums">{{ day.dayNumber }}</span>
                  </div>
                }
              </div>

              <div class="d-flex justify-content-between align-items-center mb-3 pt-2 border-top">
                <h3 class="h6 fw-bold mb-0">Agenda</h3>
                <span class="small text-muted">3 más próximas</span>
              </div>

              @if (agenda().length === 0) {
                <p class="text-muted small mb-0">No hay actividades próximas programadas.</p>
              } @else {
                <div class="d-flex flex-column gap-2">
                  @for (ev of agenda(); track ev.id) {
                    <div class="agenda-item p-3" [attr.data-tone]="ev.tone">
                      <div class="d-flex justify-content-between align-items-center small mb-1">
                        <span class="fw-bold tabular-nums">{{ ev.event_time }}</span>
                        <span class="agenda-tag">{{ ev.tag }}</span>
                      </div>
                      <div class="fw-semibold small">{{ ev.title }}</div>
                      <div class="text-muted" style="font-size: 0.72rem;">
                        {{ ev.event_date | date: 'dd/MM/yyyy' }}
                      </div>
                    </div>
                  }
                </div>
              }
            </section>

            @if (currentUser()?.role === 'admin') {
              <div class="accent-violet-card p-4">
                <div class="d-inline-flex align-items-center justify-content-center rounded-3 bg-white bg-opacity-25 p-2 mb-3">
                  <i class="bi bi-person-workspace fs-4"></i>
                </div>
                <h3 class="h5 fw-bold mb-2">Directorio Docente</h3>
                <p class="small text-white-50 mb-3">
                  Consulta cursos, clases asignadas, teléfonos y direcciones de tus profesores.
                </p>
                <a routerLink="/teachers" class="btn btn-ink btn-sm px-4">Ir a Profesores</a>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .greeting-title {
        color: var(--zegel-ink);
        letter-spacing: -0.02em;
      }

      .tile-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.15rem;
      }

      .tone-violet {
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary);
      }

      .tone-mint {
        background: var(--zegel-success-soft);
        color: var(--zegel-success);
      }

      .tone-amber {
        background: var(--zegel-warning-soft);
        color: var(--zegel-warning);
      }

      .tone-sky {
        background: #e0f2fe;
        color: #0369a1;
      }

      /* Weekly Attendance Chart */
      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
      }

      .dot-violet {
        background: var(--zegel-primary);
      }

      .dot-amber {
        background: #fbbf24;
      }

      .attendance-chart {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        align-items: end;
        padding-top: 12px;
      }

      .attendance-col {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .bars-pair {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        height: 150px;
      }

      .bar-track {
        width: 16px;
        height: 100%;
        background: #eceef8;
        border-radius: 9999px;
        display: flex;
        align-items: flex-end;
        overflow: hidden;
      }

      .bar-fill {
        width: 100%;
        border-radius: 9999px;
        transition: height 300ms ease;
        position: relative;
      }

      .bar-present {
        background: linear-gradient(180deg, #7c74ff 0%, #5b52f0 100%);
      }

      .bar-absent {
        background: #fcd34d;
      }

      .bar-pct {
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.58rem;
        font-weight: 700;
        color: #ffffff;
        writing-mode: vertical-rl;
      }

      /* Weekly Calendar Strip */
      .week-strip {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 6px;
      }

      .week-day-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 4px;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid var(--zegel-border);
      }

      .week-day-cell.today {
        background: var(--zegel-primary);
        border-color: var(--zegel-primary);
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(108, 99, 255, 0.28);
      }

      .week-day-label {
        font-size: 0.68rem;
        font-weight: 600;
        opacity: 0.78;
      }

      .week-day-num {
        font-size: 0.88rem;
        font-weight: 700;
      }

      /* Agenda Items */
      .agenda-item {
        border-radius: 14px;
        border: 1px solid transparent;
      }

      .agenda-item[data-tone='violet'] {
        background: var(--zegel-primary-soft);
        border-color: var(--zegel-primary-border);
      }

      .agenda-item[data-tone='amber'] {
        background: var(--zegel-warning-soft);
        border-color: var(--zegel-warning-border);
      }

      .agenda-item[data-tone='mint'] {
        background: var(--zegel-success-soft);
        border-color: var(--zegel-success-border);
      }

      .agenda-tag {
        padding: 2px 8px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.85);
        font-size: 0.68rem;
        font-weight: 700;
      }

      /* Notices */
      .notice-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .notice-tag {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 9999px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        font-size: 0.7rem;
        font-weight: 700;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reportService = inject(ReportService);
  private readonly courseService = inject(CourseService);
  private readonly widgetService = inject(DashboardWidgetService);

  readonly currentUser = signal(this.authService.getCurrentUser());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly summary = signal<ReportSummary | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly history = signal<EnrollmentHistory[]>([]);
  readonly agenda = signal<AgendaEvent[]>([]);
  readonly attendance = signal<WeeklyAttendance[]>([]);
  readonly notices = signal<NoticeItem[]>([]);

  readonly weekDays = computed<WeekDayCell[]>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom .. 6=Sáb
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return labels.map((label, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return {
        label,
        dayNumber: d.getDate(),
        isToday:
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear(),
      };
    });
  });

  readonly currentMonthLabel = computed(() =>
    new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date()),
  );

  readonly firstName = computed(() => {
    const raw = (this.currentUser()?.name ?? 'Usuario').trim();
    const cleaned = raw.replace(/^(Prof\.|Dr\.|Mg\.|Ing\.)\s+/i, '');
    return cleaned.split(' ')[0] || raw;
  });

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
      forkJoin({
        summary: this.reportService.getSummary(),
        agenda: this.widgetService.getAgenda().pipe(catchError(() => of([]))),
        attendance: this.widgetService.getWeeklyAttendance().pipe(catchError(() => of([]))),
        notices: this.widgetService.getNotices().pipe(catchError(() => of([]))),
      }).subscribe({
        next: ({ summary, agenda, attendance, notices }) => {
          this.summary.set(summary);
          this.agenda.set(agenda);
          this.attendance.set(attendance);
          this.notices.set(notices);
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
      forkJoin({
        courses: this.courseService.getCourses(),
        agenda: this.widgetService.getAgenda().pipe(catchError(() => of([]))),
        attendance: this.widgetService.getWeeklyAttendance().pipe(catchError(() => of([]))),
        notices: this.widgetService.getNotices().pipe(catchError(() => of([]))),
      }).subscribe({
        next: ({ courses, agenda, attendance, notices }) => {
          this.courses.set(courses);
          this.agenda.set(agenda);
          this.attendance.set(attendance);
          this.notices.set(notices);
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
      agenda: this.widgetService.getAgenda().pipe(catchError(() => of([]))),
      notices: this.widgetService.getNotices().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ courses, history, agenda, notices }) => {
        this.courses.set(courses);
        this.history.set(history);
        this.agenda.set(agenda);
        this.notices.set(notices);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar tu resumen académico.');
        this.loading.set(false);
      },
    });
  }
}
