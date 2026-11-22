import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EnrollmentHistory } from '../../../core/models/enrollment.model';
import { CourseService } from '../../../core/services/course.service';

@Component({
  selector: 'app-course-history',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="history-container">
      <header class="page-header">
        <div>
          <h1>Historial de Notas</h1>
          <p class="subtitle">Registro académico de cursos matriculados y calificaciones</p>
        </div>

        <a mat-stroked-button color="primary" routerLink="/courses">
          <mat-icon>arrow_back</mat-icon>
          Volver a cursos
        </a>
      </header>

      <section class="summary-grid">
        <mat-card class="summary-card">
          <mat-card-content>
            <span class="summary-label">Promedio General</span>
            <div class="summary-value">
              @if (averageGrade() !== null) {
                {{ averageGrade() | number: '1.2-2' }}
              } @else {
                —
              }
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <span class="summary-label">Cursos Aprobados</span>
            <div class="summary-value">{{ approvedCount() }}</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <span class="summary-label">Total Registrados</span>
            <div class="summary-value">{{ history().length }}</div>
          </mat-card-content>
        </mat-card>
      </section>

      <mat-card class="table-card">
        <mat-card-content>
          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="36"></mat-spinner>
              <span>Cargando historial...</span>
            </div>
          } @else if (history().length === 0) {
            <div class="empty-state">
              <mat-icon>grade</mat-icon>
              <p>Aún no tienes registros en tu historial académico.</p>
            </div>
          } @else {
            <div class="table-wrapper">
              <table mat-table [dataSource]="history()" class="history-table">
                <ng-container matColumnDef="cycle">
                  <th mat-header-cell *matHeaderCellDef>Ciclo</th>
                  <td mat-cell *matCellDef="let item">{{ item.cycle }}</td>
                </ng-container>

                <ng-container matColumnDef="course_code">
                  <th mat-header-cell *matHeaderCellDef>Código</th>
                  <td mat-cell *matCellDef="let item">
                    <strong>{{ item.course_code }}</strong>
                  </td>
                </ng-container>

                <ng-container matColumnDef="course_title">
                  <th mat-header-cell *matHeaderCellDef>Curso</th>
                  <td mat-cell *matCellDef="let item">{{ item.course_title }}</td>
                </ng-container>

                <ng-container matColumnDef="credits">
                  <th mat-header-cell *matHeaderCellDef>Créditos</th>
                  <td mat-cell *matCellDef="let item">{{ item.credits }}</td>
                </ng-container>

                <ng-container matColumnDef="final_grade">
                  <th mat-header-cell *matHeaderCellDef>Nota Final</th>
                  <td mat-cell *matCellDef="let item">
                    @if (item.final_grade !== null) {
                      <strong>{{ item.final_grade | number: '1.1-2' }}</strong>
                    } @else {
                      <span class="pending-text">Pendiente</span>
                    }
                  </td>
                </ng-container>

                <ng-container matColumnDef="result">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let item">
                    @if (item.final_grade === null) {
                      <span class="status-chip chip-pending">En curso</span>
                    } @else if (item.final_grade >= 13) {
                      <span class="status-chip chip-approved">Aprobado</span>
                    } @else {
                      <span class="status-chip chip-failed">Desaprobado</span>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .history-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
      }

      .page-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--zegel-text);
      }

      .subtitle {
        margin: 4px 0 0;
        color: var(--zegel-muted);
        font-size: 14px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: 16px;
      }

      .summary-label {
        font-size: 13px;
        color: var(--zegel-muted);
        font-weight: 600;
      }

      .summary-value {
        margin-top: 6px;
        font-size: 28px;
        font-weight: 700;
        color: var(--zegel-primary);
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .history-table {
        width: 100%;
      }

      .pending-text {
        color: var(--zegel-muted);
        font-style: italic;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: var(--zegel-radius-pill);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.5;
      }

      .chip-approved {
        background-color: var(--zegel-success-soft);
        color: var(--zegel-success);
        border: 2px solid var(--zegel-success-border);
      }

      .chip-failed {
        background-color: var(--zegel-error-soft);
        color: var(--zegel-error);
        border: 2px solid var(--zegel-error-border);
      }

      .chip-pending {
        background-color: var(--zegel-neutral-soft);
        color: var(--zegel-muted);
        border: 2px solid var(--zegel-neutral-border);
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 40px 16px;
        color: var(--zegel-muted);
      }
    `,
  ],
})
export class CourseHistoryComponent implements OnInit {
  private readonly courseService = inject(CourseService);

  readonly displayedColumns = [
    'cycle',
    'course_code',
    'course_title',
    'credits',
    'final_grade',
    'result',
  ];
  readonly history = signal<EnrollmentHistory[]>([]);
  readonly loading = signal(true);

  readonly approvedCount = computed(
    () =>
      this.history().filter(
        (item) => item.final_grade !== null && item.final_grade >= 13,
      ).length,
  );

  readonly averageGrade = computed(() => {
    const graded = this.history().filter((item) => item.final_grade !== null);
    if (graded.length === 0) {
      return null;
    }
    const total = graded.reduce((acc, item) => acc + (item.final_grade ?? 0), 0);
    return total / graded.length;
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
