import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentCourseView } from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { HighlightStatusDirective } from '../../../shared/directives/highlight-status.directive';
import { CourseStatusPipe } from '../../../shared/pipes/course-status.pipe';

@Component({
  selector: 'app-student-course-view',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, CourseStatusPipe, HighlightStatusDirective],
  template: `
    <div class="d-flex flex-column gap-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <a routerLink="/courses" class="btn btn-light border btn-sm">
            <i class="bi bi-arrow-left me-1"></i>Volver a Mis Cursos
          </a>
          @if (course(); as c) {
            <div>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <h1 class="h4 fw-bold mb-0">{{ c.code }} — {{ c.title }}</h1>
                <span [appHighlightStatus]="c.status">{{ c.status | courseStatus }}</span>
              </div>
              <p class="text-muted small mb-0">
                {{ c.career }} &middot; {{ c.credits }} créditos &middot;
                Docente: <strong>{{ c.teacher_name || 'Por asignar' }}</strong> &middot;
                Ciclo {{ c.enrollment.cycle }}
              </p>
            </div>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="bento-panel p-5 text-center text-muted">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <div>Cargando información del curso...</div>
        </div>
      } @else if (error()) {
        <div class="bento-panel p-4 d-flex justify-content-between align-items-center text-danger">
          <span>{{ error() }}</span>
          <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadView()">
            Reintentar
          </button>
        </div>
      } @else if (course(); as c) {
        <!-- Summary Strip -->
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <div class="elevated-card p-3 p-md-4 h-100">
              <div class="text-muted small fw-semibold">Mi Asistencia</div>
              <div
                class="fs-2 fw-bold tabular-nums mt-1"
                [class.text-success]="c.attendance.attendance_pct >= 75"
                [class.text-danger]="c.attendance.attendance_pct < 75"
              >
                {{ c.attendance.attendance_pct }}%
              </div>
              <div class="text-muted" style="font-size: 0.75rem;">
                @if (c.attendance.attendance_pct < 75) {
                  <span class="text-danger fw-semibold">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i>Riesgo por inasistencias (&lt; 75%)
                  </span>
                } @else {
                  {{ c.attendance.present_count }} presente(s) &middot;
                  {{ c.attendance.late_count }} tardanza(s) &middot;
                  {{ c.attendance.absent_count }} falta(s)
                }
              </div>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="elevated-card p-3 p-md-4 h-100">
              <div class="text-muted small fw-semibold">Estado en el Ciclo</div>
              <div class="fs-4 fw-bold text-primary mt-1">
                @if (c.enrollment.final_grade !== null) {
                  Nota: {{ c.enrollment.final_grade | number: '1.2-2' }}
                } @else {
                  En curso
                }
              </div>
              <div class="text-muted" style="font-size: 0.75rem;">
                {{ c.enrollment.status === 'completed' ? 'Ciclo cerrado' : 'Evaluación continua' }}
              </div>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="elevated-card p-3 p-md-4 h-100">
              <div class="text-muted small fw-semibold">Contenido del Sílabo</div>
              <div class="fs-2 fw-bold tabular-nums mt-1">{{ c.modules.length }}</div>
              <div class="text-muted" style="font-size: 0.75rem;">
                Módulos programados
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 align-items-start">
          <!-- Left: Syllabus & Attendance History -->
          <div class="col-12 col-xl-8 d-flex flex-column gap-4">
            <div class="bento-panel p-4">
              <h2 class="h5 fw-bold mb-2">Módulos / Sílabo</h2>
              <p class="small text-muted mb-3">{{ c.description || 'Sin descripción registrada.' }}</p>

              @if (c.modules.length === 0) {
                <p class="text-muted small mb-0">No hay módulos publicados aún.</p>
              } @else {
                <ul class="list-group list-group-flush">
                  @for (mod of c.modules; track mod.id ?? $index) {
                    <li class="list-group-item bg-transparent px-0 d-flex justify-content-between align-items-center">
                      <span>
                        <strong class="text-primary me-2">Módulo {{ $index + 1 }}:</strong>
                        {{ mod.title }}
                      </span>
                      <span class="badge rounded-pill text-bg-light border tabular-nums">
                        {{ mod.hours }} h
                      </span>
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="bento-panel p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h5 fw-bold mb-0">Registro de Asistencia</h2>
                <span class="small text-muted">{{ c.attendance.total_sessions }} sesión(es)</span>
              </div>

              @if (c.attendance.records.length === 0) {
                <p class="text-muted small mb-0">
                  El docente aún no ha registrado sesiones de asistencia en este curso.
                </p>
              } @else {
                <div class="table-responsive">
                  <table class="table glass-table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Fecha de sesión</th>
                        <th class="text-end">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (rec of c.attendance.records; track rec.session_date) {
                        <tr>
                          <td class="tabular-nums fw-semibold">
                            {{ rec.session_date | date: 'dd/MM/yyyy' }}
                          </td>
                          <td class="text-end">
                            @if (rec.status === 'present') {
                              <span class="badge rounded-pill text-bg-success">Presente</span>
                            } @else if (rec.status === 'late') {
                              <span class="badge rounded-pill text-bg-warning">Tardanza</span>
                            } @else {
                              <span class="badge rounded-pill text-bg-danger">Falta</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>

          <!-- Right: Upcoming Evaluations for this Course -->
          <div class="col-12 col-xl-4">
            <div class="bento-panel p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h5 fw-bold mb-0">Próximas Actividades</h2>
                <a routerLink="/agenda" class="small fw-semibold text-decoration-none">Ver agenda</a>
              </div>

              @if (c.upcoming_events.length === 0) {
                <p class="text-muted small mb-0">
                  No hay evaluaciones ni actividades próximas registradas para {{ c.code }}.
                </p>
              } @else {
                <div class="d-flex flex-column gap-2">
                  @for (ev of c.upcoming_events; track ev.id) {
                    <div class="p-3 rounded-4 bg-white border">
                      <div class="fw-bold small">{{ ev.title }}</div>
                      <div class="text-muted" style="font-size: 0.75rem;">
                        {{ ev.event_date | date: 'dd/MM/yyyy' }} &middot; {{ ev.event_time }}
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class StudentCourseViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);

  private courseId = 0;
  readonly course = signal<StudentCourseView | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadView();
  }

  loadView(): void {
    this.loading.set(true);
    this.error.set(null);
    this.courseService.getStudentCourseView(this.courseId).subscribe({
      next: (data) => {
        this.course.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la vista del curso.');
        this.loading.set(false);
      },
    });
  }
}
