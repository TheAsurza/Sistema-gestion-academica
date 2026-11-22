import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';
import { NotFoundComponent } from './shared/components/not-found/not-found.component';
import { UnauthorizedComponent } from './shared/components/unauthorized/unauthorized.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'courses',
        loadChildren: () =>
          import('./features/courses/courses.routes').then((m) => m.COURSES_ROUTES),
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
    ],
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
];
