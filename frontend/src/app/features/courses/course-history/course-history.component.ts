import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EnrollmentHistory } from '../../../core/models/enrollment.model';
import { CourseService } from '../../../core/services/course.service';

@Component({
  selector: 'app-course-history',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  template: `
    <div class="d-flex flex-column gap-4">
      <header class="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 class="h3 fw-bold mb-1">Historial Académico</h1>
          <p class="text-muted small mb-0">Registro de cursos y calificaciones de ciclos pasados</p>
        </div>

        <a class="btn btn-outline-primary bg-white bg-opacity-50 btn-sm" routerLink="/courses">
          <i class="bi bi-arrow-left me-1"></i>Volver a Cursos
        </a>
      </header>

      <div class="row g-3">
        <div class="col-12 col-sm-4">
          <div class="glass-card p-3 p-md-4">
            <div class="text-muted small fw-semibold">Cursos en historial</div>
            <div class="fs-2 fw-bold text-primary tabular-nums mt-1">{{ history().length }}</div>
          </div>
        </div>

        <div class="col-12 col-sm-4">
          <div class="glass-card p-3 p-md-4">
            <div class="text-muted small fw-semibold">Aprobados</div>
            <div class="fs-2 fw-bold text-success tabular-nums mt-1">{{ approvedCount() }}</div>
          </div>
        </div>

        <div class="col-12 col-sm-4">
          <div class="glass-card p-3 p-md-4">
            <div class="text-muted small fw-semibold">Promedio</div>
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
        @if (loading()) {
          <div class="text-center py-5 text-muted">
            <div class="spinner-border text-primary mb-2" role="status"></div>
            <div>Cargando historial académico...</div>
          </div>
        } @else if (history().length === 0) {
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
                  <th>Créditos</th>
                  <th>Nota Final</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of history(); track item.id) {
                  <tr>
                    <td><span class="fw-semibold">{{ item.cycle }}</span></td>
                    <td><strong>{{ item.course_code }}</strong></td>
                    <td>{{ item.course_title }}</td>
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

  readonly history = signal<EnrollmentHistory[]>([]);
  readonly loading = signal(true);

  readonly approvedCount = computed(
    () =>
      this.history().filter((item) => item.final_grade !== null && item.final_grade >= 13)
        .length,
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
    this.courseService.getStudentHistory().subscribe({
      next: (items) => {
        this.history.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
