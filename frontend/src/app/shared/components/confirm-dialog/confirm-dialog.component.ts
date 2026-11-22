import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div
      class="glass-modal-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title"
      (click)="confirmed.emit(false)"
    >
      <div class="glass-modal confirm-modal p-4" (click)="$event.stopPropagation()">
        <div class="d-flex align-items-start gap-3 mb-3">
          <div class="confirm-icon-wrap">
            <i class="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div>
            <h5 class="fw-bold mb-1">{{ title }}</h5>
            <p class="text-muted mb-0 small">{{ message }}</p>
          </div>
        </div>

        <div class="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm px-3"
            (click)="confirmed.emit(false)"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-danger btn-sm px-3"
            (click)="confirmed.emit(true)"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .confirm-modal {
        max-width: 420px;
      }

      .confirm-icon-wrap {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--zegel-error-soft);
        color: var(--zegel-error);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        flex-shrink: 0;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmar acción';
  @Input() message = '¿Deseas continuar?';
  @Input() confirmText = 'Confirmar';
  @Output() confirmed = new EventEmitter<boolean>();
}
