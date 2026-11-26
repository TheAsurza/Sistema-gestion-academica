import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EnrollmentHistory } from '../../../core/models/enrollment.model';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';

@Component({
  selector: 'app-course-history',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Historial y Boleta de Notas</h1>
          <p class="text-muted small mb-0">
            @if (currentUser(); as u) {
              <span class="fw-semibold text-dark">{{ u.user_code || '#' + u.id }}</span> &middot;
              {{ u.name }}
              @if (u.career) {
                &middot; {{ u.career }}
              }
            } @else {
              Registro de cursos y calificaciones de ciclos pasados
            }
          </p>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <a class="btn btn-light border btn-sm" routerLink="/courses">
            <i class="bi bi-arrow-left me-1"></i>Mis Cursos
          </a>

          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            [disabled]="filteredHistory().length === 0"
            (click)="exportCsv()"
          >
            <i class="bi bi-filetype-csv me-1"></i>Exportar CSV
          </button>

          <button
            type="button"
            class="btn btn-ink btn-sm px-3"
            [disabled]="filteredHistory().length === 0"
            (click)="printBoleta()"
          >
            <i class="bi bi-printer me-1"></i>Boleta PDF
          </button>
        </div>
      </header>

      <div class="row g-3">
        <div class="col-6 col-xl-3">
          <div class="elevated-card p-3 p-md-4 h-100">
            <div class="text-muted small fw-semibold">Cursos cursados</div>
            <div class="fs-2 fw-bold text-primary tabular-nums mt-1">
              {{ filteredHistory().length }}
            </div>
          </div>
        </div>

        <div class="col-6 col-xl-3">
          <div class="elevated-card p-3 p-md-4 h-100">
            <div class="text-muted small fw-semibold">Aprobados</div>
            <div class="fs-2 fw-bold text-success tabular-nums mt-1">{{ approvedCount() }}</div>
          </div>
        </div>

        <div class="col-6 col-xl-3">
          <div class="elevated-card p-3 p-md-4 h-100">
            <div class="text-muted small fw-semibold">Créditos aprobados</div>
            <div class="fs-2 fw-bold tabular-nums mt-1">{{ approvedCredits() }}</div>
          </div>
        </div>

        <div class="col-6 col-xl-3">
          <div class="elevated-card p-3 p-md-4 h-100">
            <div class="text-muted small fw-semibold">Promedio ponderado</div>
            <div class="fs-2 fw-bold text-primary tabular-nums mt-1">
              @if (averageGrade() !== null) {
                {{ averageGrade() | number: '1.2-2' }}
              } @else {
                —
              }
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card p-3 p-md-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div class="d-flex align-items-center gap-2">
            <label for="cycleFilterSelect" class="small fw-semibold text-muted">Ciclo:</label>
            <select
              id="cycleFilterSelect"
              class="form-select form-select-sm"
              style="width: auto;"
              [ngModel]="cycleFilter()"
              (ngModelChange)="cycleFilter.set($event)"
            >
              <option value="all">Todos los ciclos</option>
              @for (cycle of availableCycles(); track cycle) {
                <option [value]="cycle">{{ cycle }}</option>
              }
            </select>
          </div>

          <span class="small text-muted fw-semibold">
            {{ filteredHistory().length }} registro(s)
          </span>
        </div>

        @if (loading()) {
          <div class="text-center py-5 text-muted">
            <div class="spinner-border text-primary mb-2" role="status"></div>
            <div>Cargando historial académico...</div>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-0">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ error() }}</span>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm" (click)="loadHistory()">
              Reintentar
            </button>
          </div>
        } @else if (filteredHistory().length === 0) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-award fs-1 d-block mb-2 opacity-50"></i>
            <p class="mb-0">No cuentas con registros en tu historial de notas.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table glass-table table-hover">
              <thead>
                <tr>
                  <th>Ciclo</th>
                  <th>Código</th>
                  <th>Curso</th>
                  <th>Docente</th>
                  <th>Créditos</th>
                  <th>Nota Final</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredHistory(); track item.id) {
                  <tr>
                    <td><span class="fw-semibold">{{ item.cycle }}</span></td>
                    <td><strong>{{ item.course_code }}</strong></td>
                    <td>{{ item.course_title }}</td>
                    <td class="small text-muted">{{ item.teacher_name || '—' }}</td>
                    <td class="tabular-nums">{{ item.credits }}</td>
                    <td class="tabular-nums">
                      @if (item.final_grade !== null) {
                        <strong>{{ item.final_grade | number: '1.2-2' }}</strong>
                      } @else {
                        <span class="text-muted fst-italic">Pendiente</span>
                      }
                    </td>
                    <td>
                      @if (item.final_grade === null) {
                        <span class="status-chip chip-pending">En curso</span>
                      } @else if (item.final_grade >= 13) {
                        <span class="status-chip chip-approved">Aprobado</span>
                      } @else {
                        <span class="status-chip chip-failed">Desaprobado</span>
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
  `,
  styles: [
    `
      .status-chip {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .chip-approved {
        background-color: var(--zegel-success-soft);
        color: var(--zegel-success);
        border: 1px solid var(--zegel-success-border);
      }

      .chip-failed {
        background-color: var(--zegel-error-soft);
        color: var(--zegel-error);
        border: 1px solid var(--zegel-error-border);
      }

      .chip-pending {
        background-color: var(--zegel-neutral-soft);
        color: var(--zegel-muted);
        border: 1px solid var(--zegel-neutral-border);
      }
    `,
  ],
})
export class CourseHistoryComponent implements OnInit {
  private readonly courseService = inject(CourseService);
  private readonly authService = inject(AuthService);

  readonly currentUser = signal(this.authService.getCurrentUser());
  readonly history = signal<EnrollmentHistory[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cycleFilter = signal<string>('all');

  readonly availableCycles = computed(() =>
    Array.from(new Set(this.history().map((h) => h.cycle))).sort().reverse(),
  );

  readonly filteredHistory = computed(() => {
    const cycle = this.cycleFilter();
    if (cycle === 'all') {
      return this.history();
    }
    return this.history().filter((item) => item.cycle === cycle);
  });

  readonly approvedCount = computed(
    () =>
      this.filteredHistory().filter((item) => item.final_grade !== null && item.final_grade >= 13)
        .length,
  );

  readonly approvedCredits = computed(() =>
    this.filteredHistory()
      .filter((item) => item.final_grade !== null && item.final_grade >= 13)
      .reduce((acc, item) => acc + item.credits, 0),
  );

  readonly averageGrade = computed(() => {
    const graded = this.filteredHistory().filter((item) => item.final_grade !== null);
    if (graded.length === 0) {
      return null;
    }
    const totalCredits = graded.reduce((acc, item) => acc + item.credits, 0);
    if (totalCredits === 0) {
      const sum = graded.reduce((acc, item) => acc + (item.final_grade ?? 0), 0);
      return sum / graded.length;
    }
    const weighted = graded.reduce(
      (acc, item) => acc + (item.final_grade ?? 0) * item.credits,
      0,
    );
    return weighted / totalCredits;
  });

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading.set(true);
    this.error.set(null);
    this.courseService.getStudentHistory().subscribe({
      next: (items) => {
        this.history.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar tu historial académico.');
        this.loading.set(false);
      },
    });
  }

  exportCsv(): void {
    const rows = this.filteredHistory();
    if (rows.length === 0) {
      return;
    }
    const header = ['Ciclo', 'Codigo', 'Curso', 'Docente', 'Creditos', 'Nota', 'Estado'];
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          `"${r.cycle}"`,
          `"${r.course_code}"`,
          `"${r.course_title.replace(/"/g, '""')}"`,
          `"${(r.teacher_name ?? '').replace(/"/g, '""')}"`,
          r.credits,
          r.final_grade ?? '',
          r.final_grade === null ? 'En curso' : r.final_grade >= 13 ? 'Aprobado' : 'Desaprobado',
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boleta-notas-zegel.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  printBoleta(): void {
    window.print();
  }
}
