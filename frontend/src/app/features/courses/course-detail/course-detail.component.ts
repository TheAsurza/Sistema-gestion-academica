import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AttendanceStatus,
  CourseAttendanceRecord,
  CourseDetail,
  CourseEnrolledStudent,
} from '../../../core/models/course.model';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../core/services/toast.service';
import { HighlightStatusDirective } from '../../../shared/directives/highlight-status.directive';
import { CourseStatusPipe } from '../../../shared/pipes/course-status.pipe';

type CourseTab = 'students' | 'attendance' | 'modules';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, CourseStatusPipe, HighlightStatusDirective],
  template: `
    <div class="d-flex flex-column gap-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <a routerLink="/courses" class="btn btn-light border btn-sm">
            <i class="bi bi-arrow-left me-1"></i>Volver a Cursos
          </a>
          @if (course(); as c) {
            <div>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <h1 class="h4 fw-bold mb-0">{{ c.code }} — {{ c.title }}</h1>
                <span [appHighlightStatus]="c.status">{{ c.status | courseStatus }}</span>
              </div>
              <p class="text-muted small mb-0">
                {{ c.career }} &middot; {{ c.credits }} créditos &middot;
                {{ c.teacher_name || 'Docente por asignar' }}
              </p>
            </div>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="bento-panel p-5 text-center text-muted">
          <div class="spinner-border text-primary mb-2" role="status"></div>
          <div>Cargando gestión del curso...</div>
        </div>
      } @else if (error()) {
        <div class="bento-panel p-4 d-flex justify-content-between align-items-center text-danger">
          <span>{{ error() }}</span>
          <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadDetail()">
            Reintentar
          </button>
        </div>
      } @else if (course(); as c) {
        <!-- Course Sub-sections Tabs -->
        <div class="d-flex flex-wrap gap-2" role="tablist" aria-label="Subsecciones del curso">
          <button
            type="button"
            role="tab"
            class="filter-pill"
            [class.active]="activeTab() === 'students'"
            (click)="activeTab.set('students')"
          >
            <i class="bi bi-people-fill me-1"></i>Alumnos y Notas ({{ c.students.length }})
          </button>
          <button
            type="button"
            role="tab"
            class="filter-pill"
            [class.active]="activeTab() === 'attendance'"
            (click)="switchToAttendance()"
          >
            <i class="bi bi-calendar2-check-fill me-1"></i>Asistencia
          </button>
          <button
            type="button"
            role="tab"
            class="filter-pill"
            [class.active]="activeTab() === 'modules'"
            (click)="activeTab.set('modules')"
          >
            <i class="bi bi-list-check me-1"></i>Módulos / Sílabo ({{ c.modules.length }})
          </button>
        </div>

        <!-- TAB 1: Alumnos y Notas -->
        @if (activeTab() === 'students') {
          <div class="glass-card p-3 p-md-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h2 class="h5 fw-bold mb-0">Alumnos Matriculados y Calificaciones</h2>
                <p class="small text-muted mb-0">
                  Registra la nota final (0–20) y marca el estado para cerrar el ciclo del alumno.
                </p>
              </div>
              <span class="badge rounded-pill text-bg-light border">
                Promedio del curso:
                {{
                  courseAverage() !== null
                    ? (courseAverage() | number: '1.2-2')
                    : 'Sin notas'
                }}
              </span>
            </div>

            @if (c.students.length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="bi bi-mortarboard fs-1 d-block mb-2 opacity-50"></i>
                <p class="mb-0">Aún no hay alumnos matriculados en este curso.</p>
              </div>
            } @else {
              <div class="table-responsive">
                <table class="table glass-table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Alumno</th>
                      <th>Ciclo</th>
                      <th class="text-center">Asistencia</th>
                      <th style="width: 120px;">Nota (0–20)</th>
                      <th style="width: 165px;">Estado</th>
                      <th class="text-end">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (stu of c.students; track stu.enrollment_id) {
                      <tr>
                        <td class="tabular-nums">
                          <span class="badge rounded-pill text-bg-light border">
                            {{ stu.user_code }}
                          </span>
                        </td>
                        <td>
                          <div class="fw-bold">{{ stu.name }}</div>
                          <div class="small text-muted">{{ stu.career || stu.email }}</div>
                        </td>
                        <td class="small fw-semibold">{{ stu.cycle }}</td>
                        <td class="text-center tabular-nums">
                          <span
                            class="badge rounded-pill"
                            [class.text-bg-success]="stu.attendance_pct >= 80"
                            [class.text-bg-warning]="stu.attendance_pct >= 60 && stu.attendance_pct < 80"
                            [class.text-bg-danger]="stu.attendance_pct < 60"
                          >
                            {{ stu.attendance_pct }}%
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            class="form-control form-control-sm tabular-nums"
                            [ngModel]="stu.final_grade"
                            (ngModelChange)="onGradeInput(stu, $event)"
                            placeholder="—"
                          />
                        </td>
                        <td>
                          <select
                            class="form-select form-select-sm"
                            [ngModel]="stu.status"
                            (ngModelChange)="stu.status = $event"
                          >
                            <option value="enrolled">En curso</option>
                            <option value="completed">Completado</option>
                          </select>
                        </td>
                        <td class="text-end">
                          <button
                            type="button"
                            class="btn btn-sm btn-ink px-3"
                            [disabled]="savingEnrollmentId() === stu.enrollment_id"
                            (click)="saveGrade(stu)"
                          >
                            @if (savingEnrollmentId() === stu.enrollment_id) {
                              <span class="spinner-border spinner-border-sm"></span>
                            } @else {
                              Guardar
                            }
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- TAB 2: Asistencia -->
        @if (activeTab() === 'attendance') {
          <div class="glass-card p-3 p-md-4">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
              <div>
                <h2 class="h5 fw-bold mb-0">Registro de Asistencia por Sesión</h2>
                <p class="small text-muted mb-0">
                  Selecciona la fecha de clase y marca la asistencia de tus alumnos activos.
                </p>
              </div>

              <div class="d-flex align-items-center gap-2 flex-wrap">
                <input
                  type="date"
                  class="form-control form-control-sm"
                  style="width: auto;"
                  [ngModel]="attendanceDate()"
                  (ngModelChange)="onAttendanceDateChange($event)"
                />
                <button
                  type="button"
                  class="btn btn-ink btn-sm px-3"
                  [disabled]="savingAttendance() || attendanceRecords().length === 0"
                  (click)="saveAttendance()"
                >
                  @if (savingAttendance()) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  } @else {
                    <i class="bi bi-check2-circle me-1"></i>
                  }
                  Guardar asistencia
                </button>
              </div>
            </div>

            @if (attendanceSessions().length > 0) {
              <div class="d-flex align-items-center flex-wrap gap-2 mb-3 small">
                <span class="text-muted fw-semibold">Sesiones recientes:</span>
                @for (sess of attendanceSessions(); track sess) {
                  <button
                    type="button"
                    class="filter-pill py-1 px-2"
                    [class.active]="attendanceDate() === sess"
                    (click)="onAttendanceDateChange(sess)"
                  >
                    {{ sess }}
                  </button>
                }
              </div>
            }

            @if (loadingAttendance()) {
              <div class="text-center py-5 text-muted">
                <div class="spinner-border text-primary mb-2" role="status"></div>
                <div>Cargando lista de asistencia...</div>
              </div>
            } @else if (attendanceRecords().length === 0) {
              <div class="text-center py-5 text-muted">
                <i class="bi bi-calendar-x fs-1 d-block mb-2 opacity-50"></i>
                <p class="mb-0">No hay alumnos activos matriculados para tomar asistencia.</p>
              </div>
            } @else {
              <div class="table-responsive">
                <table class="table glass-table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Alumno</th>
                      <th class="text-center">% Acumulado</th>
                      <th class="text-end">Estado de la sesión ({{ attendanceDate() }})</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rec of attendanceRecords(); track rec.student_id) {
                      <tr>
                        <td class="tabular-nums">
                          <span class="badge rounded-pill text-bg-light border">
                            {{ rec.user_code }}
                          </span>
                        </td>
                        <td class="fw-bold">{{ rec.name }}</td>
                        <td class="text-center tabular-nums">{{ rec.attendance_pct }}%</td>
                        <td class="text-end">
                          <div class="btn-group btn-group-sm" role="group" aria-label="Estado de asistencia">
                            <button
                              type="button"
                              class="btn"
                              [class.btn-success]="rec.status === 'present'"
                              [class.btn-outline-secondary]="rec.status !== 'present'"
                              (click)="setAttendanceStatus(rec, 'present')"
                            >
                              Presente
                            </button>
                            <button
                              type="button"
                              class="btn"
                              [class.btn-warning]="rec.status === 'late'"
                              [class.btn-outline-secondary]="rec.status !== 'late'"
                              (click)="setAttendanceStatus(rec, 'late')"
                            >
                              Tardanza
                            </button>
                            <button
                              type="button"
                              class="btn"
                              [class.btn-danger]="rec.status === 'absent'"
                              [class.btn-outline-secondary]="rec.status !== 'absent'"
                              (click)="setAttendanceStatus(rec, 'absent')"
                            >
                              Falta
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- TAB 3: Módulos / Sílabo -->
        @if (activeTab() === 'modules') {
          <div class="glass-card p-3 p-md-4">
            <h2 class="h5 fw-bold mb-2">Módulos y Sílabo</h2>
            <p class="small text-muted mb-3">{{ c.description || 'Sin descripción registrada.' }}</p>

            @if (c.modules.length === 0) {
              <p class="text-muted small mb-0">No hay módulos registrados en este curso.</p>
            } @else {
              <ul class="list-group list-group-flush">
                @for (mod of c.modules; track mod.id ?? $index) {
                  <li class="list-group-item bg-transparent px-0 d-flex justify-content-between align-items-center">
                    <span>
                      <strong class="text-primary me-2">Módulo {{ $index + 1 }}:</strong>
                      {{ mod.title }}
                    </span>
                    <span class="badge rounded-pill text-bg-light border tabular-nums">
                      {{ mod.hours }} horas
                    </span>
                  </li>
                }
              </ul>
            }
          </div>
        }
      }
    </div>
  `,
})
export class CourseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly toast = inject(ToastService);

  private courseId = 0;

  readonly course = signal<CourseDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<CourseTab>('students');

  readonly savingEnrollmentId = signal<number | null>(null);

  readonly attendanceDate = signal(new Date().toISOString().slice(0, 10));
  readonly attendanceRecords = signal<CourseAttendanceRecord[]>([]);
  readonly attendanceSessions = signal<string[]>([]);
  readonly loadingAttendance = signal(false);
  readonly savingAttendance = signal(false);

  readonly courseAverage = computed(() => {
    const c = this.course();
    if (!c) {
      return null;
    }
    const graded = c.students.filter((s) => s.final_grade !== null);
    if (graded.length === 0) {
      return null;
    }
    const sum = graded.reduce((acc, s) => acc + (s.final_grade ?? 0), 0);
    return sum / graded.length;
  });

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.loadDetail();
  }

  loadDetail(): void {
    this.loading.set(true);
    this.error.set(null);
    this.courseService.getCourseDetail(this.courseId).subscribe({
      next: (data) => {
        this.course.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la gestión del curso.');
        this.loading.set(false);
      },
    });
  }

  onGradeInput(stu: CourseEnrolledStudent, value: string | number | null): void {
    if (value === null || value === '') {
      stu.final_grade = null;
      stu.status = 'enrolled';
      return;
    }
    const parsed = Number(value);
    stu.final_grade = Number.isNaN(parsed) ? null : parsed;
    if (stu.final_grade !== null) {
      stu.status = 'completed';
    }
  }

  saveGrade(stu: CourseEnrolledStudent): void {
    if (stu.final_grade !== null && (stu.final_grade < 0 || stu.final_grade > 20)) {
      this.toast.show('La nota debe estar entre 0 y 20.', 'danger');
      return;
    }
    this.savingEnrollmentId.set(stu.enrollment_id);
    this.courseService
      .updateEnrollmentGrade(stu.enrollment_id, stu.final_grade, stu.status)
      .subscribe({
        next: (res) => {
          this.savingEnrollmentId.set(null);
          stu.final_grade = res.final_grade;
          stu.status = res.status;
          this.toast.show(`Nota de ${stu.name} guardada.`, 'success');
        },
        error: () => {
          this.savingEnrollmentId.set(null);
        },
      });
  }

  switchToAttendance(): void {
    this.activeTab.set('attendance');
    this.loadAttendance();
  }

  onAttendanceDateChange(date: string): void {
    if (!date) {
      return;
    }
    this.attendanceDate.set(date);
    this.loadAttendance();
  }

  loadAttendance(): void {
    this.loadingAttendance.set(true);
    this.courseService.getCourseAttendance(this.courseId, this.attendanceDate()).subscribe({
      next: (res) => {
        this.attendanceRecords.set(res.records);
        this.attendanceSessions.set(res.sessions);
        this.loadingAttendance.set(false);
      },
      error: () => {
        this.loadingAttendance.set(false);
      },
    });
  }

  setAttendanceStatus(rec: CourseAttendanceRecord, status: AttendanceStatus): void {
    rec.status = status;
  }

  saveAttendance(): void {
    this.savingAttendance.set(true);
    const payload = this.attendanceRecords().map((r) => ({
      student_id: r.student_id,
      status: r.status,
    }));
    this.courseService
      .saveCourseAttendance(this.courseId, this.attendanceDate(), payload)
      .subscribe({
        next: () => {
          this.savingAttendance.set(false);
          this.toast.show('Asistencia registrada correctamente.', 'success');
          this.loadAttendance();
          this.refreshDetailSilently();
        },
        error: () => {
          this.savingAttendance.set(false);
        },
      });
  }

  private refreshDetailSilently(): void {
    this.courseService.getCourseDetail(this.courseId).subscribe({
      next: (data) => this.course.set(data),
      error: () => {},
    });
  }
}
