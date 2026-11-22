import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const roles = route.data['roles'] as UserRole[] | undefined;
  if (roles && !authService.hasRole(roles)) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
