import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { UserRole } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { RoleLabelPipe } from '../../pipes/role-label.pipe';

interface NavMenuItem {
  label: string;
  route: string;
  icon: string;
  roles: UserRole[];
}

const MENU_ITEMS: NavMenuItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'dashboard',
    roles: ['admin', 'profesor', 'estudiante'],
  },
  {
    label: 'Cursos',
    route: '/courses',
    icon: 'menu_book',
    roles: ['admin', 'profesor', 'estudiante'],
  },
  {
    label: 'Historial de Notas',
    route: '/courses/history',
    icon: 'grade',
    roles: ['estudiante'],
  },
  {
    label: 'Usuarios',
    route: '/users',
    icon: 'group',
    roles: ['admin'],
  },
  {
    label: 'Reportes',
    route: '/reports',
    icon: 'bar_chart',
    roles: ['admin'],
  },
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    RoleLabelPipe,
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav #sidenav mode="side" opened class="layout-sidenav">
        <div class="brand-header">
          <mat-icon class="brand-icon">school</mat-icon>
          <span class="brand-title">Zegel LMS</span>
        </div>

        <mat-nav-list>
          @for (item of visibleMenuItems$ | async; track item.route) {
            <a
              mat-list-item
              [routerLink]="item.route"
              routerLinkActive="active-nav-item"
              [routerLinkActiveOptions]="{ exact: item.route === '/courses' }"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="layout-content">
        <mat-toolbar color="primary" class="layout-toolbar">
          <button
            mat-icon-button
            type="button"
            aria-label="Alternar menú"
            (click)="sidenav.toggle()"
          >
            <mat-icon>menu</mat-icon>
          </button>

          <span class="toolbar-spacer"></span>

          @if (currentUser$ | async; as user) {
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
              <span class="role-badge">{{ user.role | roleLabel }}</span>
              <button
                mat-stroked-button
                type="button"
                class="logout-btn"
                (click)="logout()"
              >
                <mat-icon>logout</mat-icon>
                Cerrar sesión
              </button>
            </div>
          }
        </mat-toolbar>

        <main class="main-body">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .layout-container {
        height: 100vh;
      }

      .layout-sidenav {
        width: 250px;
        background: #ffffff;
        border-right: 1px solid #e0e0e0;
      }

      .brand-header {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 64px;
        padding: 0 20px;
        border-bottom: 1px solid #e0e0e0;
        font-size: 18px;
        font-weight: 600;
        color: #1565c0;
      }

      .brand-icon {
        color: #1565c0;
      }

      .active-nav-item {
        background: rgba(21, 101, 192, 0.1) !important;
        color: #1565c0 !important;
        font-weight: 500;
      }

      .layout-content {
        display: flex;
        flex-direction: column;
        background: #f5f7fa;
      }

      .layout-toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background-color: var(--mat-sys-primary);
        color: var(--mat-sys-on-primary);
      }

      .layout-toolbar button[mat-icon-button],
      .layout-toolbar .logout-btn {
        color: var(--mat-sys-on-primary);
      }

      .toolbar-spacer {
        flex: 1 1 auto;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .user-name {
        font-size: 14px;
        font-weight: 500;
      }

      .role-badge {
        padding: 2px 10px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.2);
        font-size: 12px;
        font-weight: 500;
      }

      .logout-btn {
        border-color: rgba(255, 255, 255, 0.5);
      }

      .main-body {
        padding: 24px;
        flex: 1 1 auto;
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser$ = this.authService.currentUser$;
  readonly visibleMenuItems$ = this.currentUser$.pipe(
    map((user) => {
      if (!user) {
        return [];
      }
      return MENU_ITEMS.filter((item) => item.roles.includes(user.role));
    }),
  );

  logout(): void {
    this.authService.logout();
  }
}
