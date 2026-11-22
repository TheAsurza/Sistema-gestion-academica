import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast show align-items-center border-0 glass-toast"
          [class]="badgeClass(toast.type)"
          role="alert"
        >
          <div class="d-flex align-items-center justify-content-between gap-2 px-3 py-2">
            <div class="d-flex align-items-center gap-2 small fw-medium">
              <i class="bi" [class]="iconClass(toast.type)"></i>
              <span>{{ toast.message }}</span>
            </div>
            <button
              type="button"
              class="btn-close btn-close-white ms-2"
              aria-label="Cerrar notificación"
              (click)="toastService.dismiss(toast.id)"
            ></button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        top: 1.25rem;
        right: 1.25rem;
        z-index: 1100;
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        max-width: 380px;
      }

      .glass-toast {
        border-radius: 12px;
        backdrop-filter: blur(14px);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.2);
      }
    `,
  ],
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  badgeClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'text-bg-success';
      case 'danger':
        return 'text-bg-danger';
      case 'warning':
        return 'text-bg-warning';
      default:
        return 'text-bg-primary';
    }
  }

  iconClass(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'bi-check-circle-fill';
      case 'danger':
        return 'bi-exclamation-triangle-fill';
      case 'warning':
        return 'bi-exclamation-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }
}
