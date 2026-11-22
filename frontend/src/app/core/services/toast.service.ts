import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastItem[]>([]);

  show(message: string, type: ToastType = 'info', durationMs = 3500): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, type }]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((item) => item.id !== id));
  }
}
