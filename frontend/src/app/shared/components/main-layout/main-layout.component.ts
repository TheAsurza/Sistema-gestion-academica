import { BreakpointObserver } from '@angular/cdk/layout';
import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule,
    RoleLabelPipe,
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav
        #sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="layout-sidenav"
      >
        <div class="sidenav-inner">
          <div class="brand-header">
            <div class="brand-logo">
              <mat-icon>school</mat-icon>
            </div>
            <div class="brand-text">
              <span class="brand-title">Zegel LMS</span>
              <span class="brand-subtitle">Gestión Académica</span>
            </div>
          </div>

          <div class="nav-section-label">Navegación</div>

          <mat-nav-list class="nav-list">
            @for (item of visibleMenuItems$ | async; track item.route) {
              <a
                mat-list-item
                [routerLink]="item.route"
                routerLinkActive="active-nav-item"
                [routerLinkActiveOptions]="{ exact: item.route === '/courses' }"
                (click)="isMobile() && sidenav.close()"
                class="nav-item"
              >
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
          </mat-nav-list>

          @if (currentUser$ | async; as user) {
            <div class="sidenav-footer">
              <div class="user-card">
                <div class="user-avatar">{{ getInitials(user.name) }}</div>
                <div class="user-card-meta">
                  <span class="user-card-name">{{ user.name }}</span>
                  <span class="user-card-role">{{ user.role | roleLabel }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="layout-content">
        <mat-toolbar class="layout-toolbar">
          <button
            mat-icon-button
            type="button"
            aria-label="Alternar menú"
            (click)="sidenav.toggle()"
          >
            <mat-icon>menu</mat-icon>
          </button>

          <span class="toolbar-brand-mobile">Zegel LMS</span>
          <span class="toolbar-spacer"></span>

          @if (currentUser$ | async; as user) {
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
              <span class="role-badge">{{ user.role | roleLabel }}</span>
              <button
                mat-stroked-button
                type="button"
                class="logout-btn"
                matTooltip="Cerrar sesión actual"
                (click)="logout()"
              >
                <mat-icon>logout</mat-icon>
                <span class="logout-label">Salir</span>
              </button>
            </div>
          }
        </mat-toolbar>

        <main class="main-body">
          <div class="main-inner">
            <router-outlet></router-outlet>
          </div>
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
        width: 264px;
        background: var(--zegel-surface);
        border-right: 1px solid var(--zegel-border);
      }

      .sidenav-inner {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .brand-header {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 72px;
        padding: 0 20px;
        border-bottom: 1px solid var(--zegel-border);
      }

      .brand-logo {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
      }

      .brand-text {
        display: flex;
        flex-direction: column;
      }

      .brand-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--zegel-text);
        line-height: 1.2;
      }

      .brand-subtitle {
        font-size: 11px;
        font-weight: 500;
        color: var(--zegel-muted);
        letter-spacing: 0.02em;
      }

      .nav-section-label {
        padding: 18px 20px 6px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--zegel-muted);
      }

      .nav-list {
        padding: 0 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nav-item {
        border-radius: 10px !important;
        color: #334155 !important;
        transition: background-color 150ms ease, color 150ms ease;
      }

      .nav-item:hover {
        background-color: #f1f5f9 !important;
      }

      .active-nav-item {
        background: var(--zegel-primary-soft) !important;
        color: var(--zegel-primary) !important;
        font-weight: 600 !important;
      }

      .active-nav-item mat-icon {
        color: var(--zegel-primary) !important;
      }

      .sidenav-footer {
        margin-top: auto;
        padding: 16px;
        border-top: 1px solid var(--zegel-border);
      }

      .user-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 12px;
        background: var(--zegel-bg);
        border: 1px solid var(--zegel-border);
      }

      .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--zegel-primary);
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .user-card-meta {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .user-card-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--zegel-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-card-role {
        font-size: 11px;
        color: var(--zegel-muted);
      }

      .layout-content {
        display: flex;
        flex-direction: column;
        background: var(--zegel-bg);
      }

      .layout-toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        height: 64px;
        background-color: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        color: var(--zegel-text);
        border-bottom: 1px solid var(--zegel-border);
      }

      .toolbar-brand-mobile {
        display: none;
        font-size: 16px;
        font-weight: 700;
        margin-left: 8px;
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
        font-size: 13px;
        font-weight: 600;
        color: var(--zegel-text);
      }

      .role-badge {
        padding: 4px 12px;
        border-radius: 9999px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        border: 1px solid #bfdbfe;
        font-size: 12px;
        font-weight: 600;
      }

      .logout-btn {
        border-color: var(--zegel-border) !important;
        color: var(--zegel-text) !important;
        border-radius: 10px !important;
      }

      .main-body {
        padding: 28px;
        flex: 1 1 auto;
      }

      .main-inner {
        max-width: 1280px;
        margin: 0 auto;
      }

      @media (max-width: 959px) {
        .toolbar-brand-mobile {
          display: inline;
        }

        .user-name {
          display: none;
        }

        .main-body {
          padding: 16px;
        }
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly isMobile = signal(false);
  readonly currentUser$ = this.authService.currentUser$;
  readonly visibleMenuItems$ = this.currentUser$.pipe(
    map((user) => {
      if (!user) {
        return [];
      }
      return MENU_ITEMS.filter((item) => item.roles.includes(user.role));
    }),
  );

  constructor() {
    this.breakpointObserver
      .observe(['(max-width: 959px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.isMobile.set(state.matches));
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  logout(): void {
    this.authService.logout();
  }
}
