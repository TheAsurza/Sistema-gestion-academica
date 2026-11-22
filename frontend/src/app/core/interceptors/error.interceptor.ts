import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

function extractBackendMessage(err: HttpErrorResponse): string | null {
  const payload = err.error;
  if (payload && typeof payload === 'object') {
    const record = payload as { error?: unknown; message?: unknown };
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
  }
  return null;
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        if (!req.url.includes('/auth/login')) {
          authService.logout();
          toast.show('Tu sesión ha expirado. Inicia sesión nuevamente.', 'warning', 4000);
        }
      } else if (err.status === 403) {
        toast.show('No tienes permisos para realizar esta acción.', 'danger', 4000);
        void router.navigate(['/unauthorized']);
      } else {
        const backendMessage = extractBackendMessage(err);
        toast.show(
          backendMessage ?? 'Ocurrió un error inesperado. Intenta nuevamente.',
          'danger',
          4000,
        );
      }

      return throwError(() => err);
    }),
  );
};
