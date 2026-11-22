import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
        snackBar.open('Sesión expirada. Por favor, inicia sesión nuevamente.', 'Cerrar', {
          duration: 4000,
        });
      } else if (err.status === 403) {
        void router.navigate(['/unauthorized']);
        snackBar.open('No tienes permisos para realizar esta acción.', 'Cerrar', {
          duration: 4000,
        });
      } else {
        const backendMessage =
          typeof err.error === 'object' && err.error !== null && 'message' in err.error
            ? String((err.error as { message?: unknown }).message ?? '')
            : '';
        const message = backendMessage || 'Ocurrió un error inesperado. Intenta nuevamente.';
        snackBar.open(message, 'Cerrar', { duration: 4000 });
      }

      return throwError(() => err);
    }),
  );
};
