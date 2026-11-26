import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Course } from '../../core/models/course.model';
import { AgendaEvent } from '../../core/models/dashboard-widgets.model';
import { CourseService } from '../../core/services/course.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AgendaEventPayload,
  DashboardWidgetService,
} from '../../core/services/dashboard-widget.service';
import { ToastService } from '../../core/services/toast.service';

interface WeekDayCell {
  label: string;
  dayNumber: number;
  isToday: boolean;
}

@Component({
  selector: 'app-teacher-agenda',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">
            {{ canManage ? 'Agenda Docente' : 'Mi Agenda Académica' }}
          </h1>
          <p class="text-muted small mb-0">
            {{
              canManage
                ? 'Organiza tus sesiones, evaluaciones y entregas académicas de la semana'
                : 'Consulta tus próximas evaluaciones, entregas y actividades académicas'
            }}
          </p>
        </div>
      </header>

      <div class="row g-4 align-items-start">
        <!-- Left: Weekly Strip & Scheduled Activities -->
        <div [class]="canManage ? 'col-12 col-xl-8 d-flex flex-column gap-4' : 'col-12 d-flex flex-column gap-4'">
          <div class="bento-panel p-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h6 fw-bold mb-0">Semana actual</h2>
              <span class="small text-muted fw-semibold">{{ currentMonthLabel }}</span>
            </div>

            <div class="week-grid">
              @for (day of weekDays; track day.label) {
                <div class="week-cell" [class.today]="day.isToday">
                  <span class="week-day-label">{{ day.label }}</span>
                  <span class="week-day-num tabular-nums">{{ day.dayNumber }}</span>
                </div>
              }
            </div>
          </div>

          <div class="bento-panel p-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 fw-bold mb-0">Actividades Programadas</h2>
              <span class="badge rounded-pill text-bg-light border">
                {{ events().length }} evento(s)
              </span>
            </div>

            @if (loading()) {
              <div class="text-center py-4 text-muted">
                <div class="spinner-border text-primary mb-2" role="status"></div>
                <div>Cargando agenda...</div>
              </div>
            } @else if (events().length === 0) {
              <div class="text-center py-4 text-muted">
                <i class="bi bi-calendar-check fs-1 d-block mb-2 opacity-50"></i>
                <p class="mb-0">No tienes actividades programadas por ahora.</p>
              </div>
            } @else {
              <div class="d-flex flex-column gap-2">
                @for (ev of events(); track ev.id) {
                  <div class="agenda-row p-3 rounded-4 d-flex justify-content-between align-items-center gap-3">
                    <div class="d-flex align-items-center gap-3 min-w-0">
                      <div class="tone-dot" [class]="'tone-' + ev.tone"></div>
                      <div class="min-w-0">
                        <div class="fw-bold text-truncate">{{ ev.title }}</div>
                        <div class="small text-muted">
                          {{ ev.event_date | date: 'dd/MM/yyyy' }} &middot; {{ ev.event_time }} &middot;
                          <span class="fw-semibold">{{ ev.tag }}</span>
                        </div>
                      </div>
                    </div>

                    @if (canManage) {
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger flex-shrink-0"
                        title="Eliminar actividad"
                        aria-label="Eliminar actividad"
                        (click)="deleteEvent(ev.id)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Right: Add Activity Form -->
        @if (canManage) {
          <div class="col-12 col-xl-4">
          <div class="bento-panel p-4">
            <h2 class="h5 fw-bold mb-3">Nueva Actividad</h2>
            <form class="d-flex flex-column gap-3" (ngSubmit)="createEvent()">
              <div>
                <label for="agendaTitle" class="form-label small fw-semibold">Título</label>
                <input
                  id="agendaTitle"
                  name="title"
                  type="text"
                  class="form-control"
                  [(ngModel)]="form.title"
                  placeholder="Ej. Evaluación Parcial"
                  required
                />
              </div>

              <div class="row g-2">
                <div class="col-6">
                  <label for="agendaDate" class="form-label small fw-semibold">Fecha</label>
                  <input
                    id="agendaDate"
                    name="event_date"
                    type="date"
                    class="form-control"
                    [(ngModel)]="form.event_date"
                    required
                  />
                </div>
                <div class="col-6">
                  <label for="agendaTime" class="form-label small fw-semibold">Hora</label>
                  <input
                    id="agendaTime"
                    name="event_time"
                    type="text"
                    class="form-control"
                    [(ngModel)]="form.event_time"
                    placeholder="09:00 am"
                    required
                  />
                </div>
              </div>

              <div>
                <label for="agendaTag" class="form-label small fw-semibold">Curso / Etiqueta</label>
                <select id="agendaTag" name="tag" class="form-select" [(ngModel)]="form.tag">
                  <option value="General">General</option>
                  @for (c of myCourses(); track c.id) {
                    <option [value]="c.code">{{ c.code }} — {{ c.title }}</option>
                  }
                </select>
              </div>

              <div>
                <label for="agendaTone" class="form-label small fw-semibold">Prioridad / Color</label>
                <select id="agendaTone" name="tone" class="form-select" [(ngModel)]="form.tone">
                  <option value="violet">Violeta (Académico)</option>
                  <option value="amber">Ámbar (Evaluación)</option>
                  <option value="mint">Menta (Reunión / General)</option>
                </select>
              </div>

              <button
                type="submit"
                class="btn btn-ink w-100 mt-1"
                [disabled]="saving() || !form.title.trim()"
              >
                @if (saving()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                } @else {
                  <i class="bi bi-calendar-plus me-1"></i>
                }
                Agregar a mi agenda
              </button>
            </form>
          </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .week-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 8px;
      }

      .week-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px 6px;
        border-radius: 14px;
        background: var(--zegel-bento-bg);
      }

      .week-cell.today {
        background: var(--zegel-primary);
        color: #ffffff;
      }

      .week-day-label {
        font-size: 0.72rem;
        opacity: 0.75;
      }

      .week-day-num {
        font-size: 1rem;
        font-weight: 700;
      }

      .agenda-row {
        background: var(--zegel-bento-bg);
        border: 1px solid var(--zegel-border);
      }

      .tone-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .tone-violet {
        background: var(--zegel-primary);
      }

      .tone-amber {
        background: #f59e0b;
      }

      .tone-mint {
        background: #10b981;
      }
    `,
  ],
})
export class TeacherAgendaComponent implements OnInit {
  private readonly widgetService = inject(DashboardWidgetService);
  private readonly courseService = inject(CourseService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly canManage = this.authService.hasRole(['admin', 'profesor']);
  readonly events = signal<AgendaEvent[]>([]);
  readonly myCourses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly weekDays = this.buildWeekDays();
  readonly currentMonthLabel = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  form: AgendaEventPayload = {
    event_date: new Date().toISOString().slice(0, 10),
    event_time: '09:00 am',
    title: '',
    tag: 'General',
    tone: 'violet',
  };

  ngOnInit(): void {
    this.loadEvents();
    this.courseService.getCourses().subscribe({
      next: (courses) => this.myCourses.set(courses),
      error: () => {},
    });
  }

  loadEvents(): void {
    this.loading.set(true);
    this.widgetService.getAllAgenda().subscribe({
      next: (rows) => {
        this.events.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  createEvent(): void {
    if (!this.form.title.trim() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.widgetService.createAgendaEvent(this.form).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.events.update((list) =>
          [...list, created].sort((a, b) => a.event_date.localeCompare(b.event_date)),
        );
        this.form.title = '';
        this.toast.show('Actividad agregada a tu agenda.', 'success');
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  deleteEvent(id: number): void {
    this.widgetService.deleteAgendaEvent(id).subscribe({
      next: () => {
        this.events.update((list) => list.filter((e) => e.id !== id));
        this.toast.show('Actividad eliminada.', 'success');
      },
      error: () => {},
    });
  }

  private buildWeekDays(): WeekDayCell[] {
    const today = new Date();
    const dayOfWeek = today.getDay();
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
        isToday: d.toDateString() === today.toDateString(),
      };
    });
  }
}
