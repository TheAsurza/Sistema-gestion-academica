import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
    icon: 'bi-grid-1x2-fill',
    roles: ['admin', 'profesor', 'estudiante'],
  },
  {
    label: 'Cursos',
    route: '/courses',
    icon: 'bi-journal-bookmark-fill',
    roles: ['admin', 'profesor', 'estudiante'],
  },
  {
    label: 'Historial de Notas',
    route: '/courses/history',
    icon: 'bi-award-fill',
    roles: ['estudiante'],
  },
  {
    label: 'Usuarios',
    route: '/users',
    icon: 'bi-people-fill',
    roles: ['admin'],
  },
  {
    label: 'Reportes',
    route: '/reports',
    icon: 'bi-bar-chart-fill',
    roles: ['admin'],
  },
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive, RoleLabelPipe],
  template: `
    <div class="shell-wrapper">
      <!-- Desktop Glass Sidebar -->
      <aside class="glass-sidebar d-none d-lg-flex flex-column">
        <div class="brand-header">
          <div class="brand-logo">
            <i class="bi bi-mortarboard-fill"></i>
          </div>
          <div>
            <div class="brand-title">Zegel LMS</div>
            <div class="brand-subtitle">Gestión Académica</div>
          </div>
        </div>

        <div class="nav-label">Navegación</div>
        <nav class="nav flex-column px-3 gap-1">
          @for (item of visibleMenuItems$ | async; track item.route) {
            <a
              class="nav-link glass-nav-link"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/courses' }"
            >
              <i class="bi" [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        @if (currentUser$ | async; as user) {
          <div class="mt-auto p-3 border-top border-white border-opacity-10">
            <div class="sidebar-user-card">
              <div class="user-avatar">{{ getInitials(user.name) }}</div>
              <div class="min-w-0">
                <div class="text-white fw-semibold small text-truncate">{{ user.name }}</div>
                <div class="text-secondary-light small">{{ user.role | roleLabel }}</div>
              </div>
            </div>
          </div>
        }
      </aside>

      <!-- Mobile Offcanvas Sidebar -->
      @if (mobileMenuOpen()) {
        <div class="mobile-backdrop d-lg-none" (click)="mobileMenuOpen.set(false)">
          <aside
            class="glass-sidebar mobile-drawer d-flex flex-column"
            (click)="$event.stopPropagation()"
          >
            <div class="brand-header justify-content-between">
              <div class="d-flex align-items-center gap-2">
                <div class="brand-logo">
                  <i class="bi bi-mortarboard-fill"></i>
                </div>
                <span class="brand-title">Zegel LMS</span>
              </div>
              <button
                type="button"
                class="btn-close btn-close-white"
                aria-label="Cerrar menú"
                (click)="mobileMenuOpen.set(false)"
              ></button>
            </div>

            <nav class="nav flex-column p-3 gap-1">
              @for (item of visibleMenuItems$ | async; track item.route) {
                <a
                  class="nav-link glass-nav-link"
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: item.route === '/courses' }"
                  (click)="mobileMenuOpen.set(false)"
                >
                  <i class="bi" [class]="item.icon"></i>
                  <span>{{ item.label }}</span>
                </a>
              }
            </nav>
          </aside>
        </div>
      }

      <!-- Main Content -->
      <div class="main-area">
        <header class="glass-topbar px-3 px-lg-4">
          <div class="d-flex align-items-center gap-2">
            <button
              type="button"
              class="btn btn-light btn-sm d-lg-none"
              aria-label="Abrir menú"
              (click)="mobileMenuOpen.set(true)"
            >
              <i class="bi bi-list fs-5"></i>
            </button>
            <span class="fw-bold d-lg-none">Zegel LMS</span>
          </div>

          @if (currentUser$ | async; as user) {
            <div class="d-flex align-items-center gap-2 gap-md-3 ms-auto">
              <span class="d-none d-md-inline fw-semibold small">{{ user.name }}</span>
              <span class="role-pill">{{ user.role | roleLabel }}</span>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm bg-white bg-opacity-50"
                (click)="logout()"
              >
                <i class="bi bi-box-arrow-right me-1"></i>
                <span class="d-none d-sm-inline">Salir</span>
              </button>
            </div>
          }
        </header>

        <main class="p-3 p-md-4 flex-grow-1">
          <div class="container-xl px-0">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell-wrapper {
        min-height: 100vh;
        display: flex;
      }

      .glass-sidebar {
        width: 268px;
        flex-shrink: 0;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-right: 1px solid rgba(255, 255, 255, 0.12);
        color: #f8fafc;
        position: sticky;
        top: 0;
        height: 100vh;
      }

      .brand-header {
        display: flex;
        align-items: center;
        gap: 12px;
        height: 72px;
        padding: 0 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .brand-logo {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
      }

      .brand-title {
        font-size: 1rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
      }

      .brand-subtitle {
        font-size: 0.7rem;
        color: #94a3b8;
      }

      .nav-label {
        padding: 18px 20px 8px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
      }

      .glass-nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 12px;
        color: #cbd5e1;
        font-size: 0.9rem;
        font-weight: 500;
        border: 1px solid transparent;
        transition: all 150ms ease;
      }

      .glass-nav-link:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      .glass-nav-link.active {
        background: rgba(59, 130, 246, 0.25);
        border-color: rgba(96, 165, 250, 0.35);
        color: #ffffff;
        font-weight: 600;
      }

      .glass-nav-link.active i {
        color: #93c5fd;
      }

      .sidebar-user-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
      }

      .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        color: #ffffff;
        font-size: 0.8rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .text-secondary-light {
        color: #94a3b8;
        font-size: 0.72rem;
      }

      .mobile-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1040;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(4px);
      }

      .mobile-drawer {
        height: 100vh;
      }

      .main-area {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      .glass-topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        height: 64px;
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.7);
      }

      .role-pill {
        padding: 4px 12px;
        border-radius: 9999px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        border: 1px solid var(--zegel-primary-border);
        font-size: 0.75rem;
        font-weight: 700;
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly mobileMenuOpen = signal(false);
  readonly currentUser$ = this.authService.currentUser$;
  readonly visibleMenuItems$ = this.currentUser$.pipe(
    map((user) => {
      if (!user) {
        return [];
      }
      return MENU_ITEMS.filter((item) => item.roles.includes(user.role));
    }),
  );

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
