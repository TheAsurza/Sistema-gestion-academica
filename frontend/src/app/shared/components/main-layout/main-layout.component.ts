import { AsyncPipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { User, UserRole } from '../../../core/models/user.model';
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
    icon: 'bi-grid-fill',
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
    label: 'Profesores',
    route: '/teachers',
    icon: 'bi-person-workspace',
    roles: ['admin'],
  },
  {
    label: 'Alumnos',
    route: '/students',
    icon: 'bi-mortarboard-fill',
    roles: ['admin'],
  },
  {
    label: 'Administrativos',
    route: '/staff',
    icon: 'bi-shield-check',
    roles: ['admin'],
  },
  {
    label: 'Agenda Docente',
    route: '/agenda',
    icon: 'bi-calendar2-week-fill',
    roles: ['profesor'],
  },
  {
    label: 'Mi Agenda',
    route: '/agenda',
    icon: 'bi-calendar2-week-fill',
    roles: ['estudiante'],
  },
  {
    label: 'Reportes',
    route: '/reports',
    icon: 'bi-pie-chart-fill',
    roles: ['admin', 'profesor'],
  },
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive, RoleLabelPipe],
  template: `
    <div class="app-outer-padding">
      <div class="app-shell-frame">
        <!-- Curved Left Violet Sidebar (Desktop) -->
        <aside
          class="violet-rail d-none d-lg-flex flex-column"
          [class.expanded]="sidebarExpanded()"
          aria-label="Menú lateral"
        >
          <nav class="rail-nav d-flex flex-column gap-2 w-100 pb-3">
            @for (item of visibleMenuItems$ | async; track item.route) {
              <a
                class="rail-item"
                [routerLink]="item.route"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.route === '/courses' }"
                [title]="sidebarExpanded() ? '' : item.label"
                [attr.aria-label]="item.label"
              >
                <span class="rail-icon-box">
                  <i class="bi" [class]="item.icon"></i>
                </span>
                @if (sidebarExpanded()) {
                  <span class="rail-label">{{ item.label }}</span>
                }
              </a>
            }
          </nav>

          <!-- Collapse / Expand Toggle Button (icon-only, right-aligned when expanded) -->
          <div
            class="mt-auto w-100 d-flex pt-3 border-top border-white border-opacity-15"
            [class.justify-content-end]="sidebarExpanded()"
            [class.pe-3]="sidebarExpanded()"
            [class.justify-content-center]="!sidebarExpanded()"
            [class.pe-2]="!sidebarExpanded()"
          >
            <button
              type="button"
              class="rail-toggle-btn"
              [title]="sidebarExpanded() ? 'Contraer menú' : 'Expandir menú'"
              [attr.aria-label]="sidebarExpanded() ? 'Contraer menú' : 'Expandir menú'"
              (click)="toggleSidebar()"
            >
              <i
                class="bi"
                [class]="sidebarExpanded() ? 'bi-arrow-bar-left' : 'bi-arrow-bar-right'"
              ></i>
            </button>
          </div>
        </aside>

        <!-- Mobile Drawer -->
        @if (mobileMenuOpen()) {
          <div class="mobile-backdrop d-lg-none" (click)="mobileMenuOpen.set(false)">
            <aside class="mobile-drawer d-flex flex-column p-3" (click)="$event.stopPropagation()">
              <div class="d-flex justify-content-between align-items-center pb-3 border-bottom border-white border-opacity-25">
                <span class="text-white fw-bold">Portal Zegel</span>
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  aria-label="Cerrar menú"
                  (click)="mobileMenuOpen.set(false)"
                ></button>
              </div>

              <nav class="nav flex-column gap-2 mt-3">
                @for (item of visibleMenuItems$ | async; track item.route) {
                  <a
                    class="mobile-nav-link"
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

        <!-- Main Inner Workspace -->
        <div class="shell-main">
          <header class="shell-topbar px-3 px-md-4">
            <div class="d-flex align-items-center gap-2">
              <button
                type="button"
                class="btn btn-light btn-sm d-lg-none"
                aria-label="Abrir menú"
                (click)="mobileMenuOpen.set(true)"
              >
                <i class="bi bi-list fs-5"></i>
              </button>
              <span class="fw-bold d-lg-none">Portal Zegel</span>
            </div>

            @if (currentUser$ | async; as user) {
              <div class="d-flex align-items-center gap-3 ms-auto position-relative">
                <!-- Notifications Icon + Dropdown -->
                <div class="position-relative" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="icon-circle-btn"
                    aria-label="Notificaciones"
                    title="Notificaciones"
                    (click)="toggleNotifications()"
                  >
                    <i class="bi bi-bell"></i>
                    <span class="notif-dot" aria-hidden="true"></span>
                  </button>

                  @if (notificationsOpen()) {
                    <div class="topbar-dropdown notif-dropdown p-3">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold small">Notificaciones</span>
                        <span class="badge rounded-pill text-bg-light border">Al día</span>
                      </div>
                      <p class="text-muted small mb-0">
                        No tienes notificaciones pendientes por el momento.
                      </p>
                    </div>
                  }
                </div>

                <!-- User Profile Trigger + Dropdown -->
                <div class="position-relative" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    class="user-trigger-btn"
                    [attr.aria-expanded]="userMenuOpen()"
                    (click)="toggleUserMenu()"
                  >
                    <div class="user-photo-wrap">
                      @if (!avatarLoadError()) {
                        <img
                          src="/images/user-avatar.jpg"
                          [alt]="user.name"
                          class="user-photo-img"
                          (error)="avatarLoadError.set(true)"
                        />
                      } @else {
                        <span class="user-photo-fallback">{{ getInitials(user.name) }}</span>
                      }
                    </div>
                    <span class="d-none d-sm-inline fw-semibold small text-dark">
                      {{ user.name }}
                    </span>
                    <i class="bi bi-chevron-down small text-muted"></i>
                  </button>

                  @if (userMenuOpen()) {
                    <div class="topbar-dropdown user-dropdown p-3">
                      <div class="d-flex align-items-center gap-3 pb-3 border-bottom">
                        <div class="user-photo-wrap user-photo-lg">
                          @if (!avatarLoadError()) {
                            <img
                              src="/images/user-avatar.jpg"
                              [alt]="user.name"
                              class="user-photo-img"
                              (error)="avatarLoadError.set(true)"
                            />
                          } @else {
                            <span class="user-photo-fallback">{{ getInitials(user.name) }}</span>
                          }
                        </div>
                        <div class="min-w-0">
                          <div class="fw-bold small text-truncate">{{ user.name }}</div>
                          <div class="text-muted text-truncate" style="font-size: 0.75rem;">
                            {{ user.email }}
                          </div>
                          <span class="role-badge-pill mt-1 d-inline-block">
                            {{ user.role | roleLabel }}
                          </span>
                        </div>
                      </div>

                      <div class="d-flex flex-column gap-1 pt-2">
                        <button
                          type="button"
                          class="dropdown-action-btn"
                          (click)="openAccountModal()"
                        >
                          <i class="bi bi-person-circle text-primary"></i>
                          <span>Mi cuenta</span>
                        </button>
                        <button
                          type="button"
                          class="dropdown-action-btn text-danger"
                          (click)="logout()"
                        >
                          <i class="bi bi-box-arrow-right"></i>
                          <span>Cerrar sesión</span>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </header>

          <main class="shell-content p-3 p-md-4">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    </div>

    <!-- Account Info Modal -->
    @if (accountModalOpen() && (currentUser$ | async); as user) {
      <div
        class="glass-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Mi cuenta"
        (click)="accountModalOpen.set(false)"
      >
        <div class="glass-modal p-4" style="max-width: 420px;" (click)="$event.stopPropagation()">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0">Mi cuenta</h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Cerrar"
              (click)="accountModalOpen.set(false)"
            ></button>
          </div>

          <div class="d-flex align-items-center gap-3 p-3 rounded-4 bg-light mb-3">
            <div class="user-photo-wrap user-photo-lg">
              @if (!avatarLoadError()) {
                <img
                  src="/images/user-avatar.jpg"
                  [alt]="user.name"
                  class="user-photo-img"
                  (error)="avatarLoadError.set(true)"
                />
              } @else {
                <span class="user-photo-fallback">{{ getInitials(user.name) }}</span>
              }
            </div>
            <div class="min-w-0">
              <div class="fw-bold">{{ user.name }}</div>
              <div class="text-muted small text-truncate">{{ user.email }}</div>
              <span class="role-badge-pill mt-1 d-inline-block">{{ user.role | roleLabel }}</span>
            </div>
          </div>

          <div class="text-muted small mb-3">
            Para actualizar la foto de perfil global de prueba, puedes colocar una imagen en
            <code>frontend/public/images/user-avatar.jpg</code>.
          </div>

          <div class="text-end">
            <button
              type="button"
              class="btn btn-ink btn-sm px-4"
              (click)="accountModalOpen.set(false)"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .app-outer-padding {
        min-height: 100vh;
        padding: 10px;
        background: var(--zegel-outer-bg);
      }

      .app-shell-frame {
        height: calc(100vh - 20px);
        max-width: 100%;
        margin: 0 auto;
        padding: 18px 18px 18px 0;
        background: linear-gradient(180deg, #6c63ff 0%, #5b52f0 100%);
        border-radius: 32px;
        box-shadow: 0 24px 60px rgba(20, 21, 38, 0.1);
        display: flex;
        overflow: hidden;
        position: relative;
      }

      /* Full-height Left Violet Sidebar */
      .violet-rail {
        width: 68px;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        align-self: stretch;
        margin: 0;
        border-radius: 0;
        background: transparent;
        padding: 60px 0 18px 8px;
        flex-shrink: 0;
        transition:
          width 220ms cubic-bezier(0.22, 1, 0.36, 1),
          padding 220ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .violet-rail.expanded {
        width: 224px;
        padding: 60px 0 18px 14px;
      }

      .rail-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        height: 46px;
        padding: 0 10px;
        border-radius: 16px 0 0 16px;
        color: rgba(255, 255, 255, 0.9);
        text-decoration: none;
        transition:
          background-color 150ms ease,
          color 150ms ease;
        white-space: nowrap;
      }

      .violet-rail:not(.expanded) .rail-item {
        justify-content: center;
        padding: 0;
      }

      .rail-item:hover:not(.active) {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }

      .rail-icon-box {
        width: 36px;
        height: 36px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.12rem;
        flex-shrink: 0;
        transition: color 150ms ease;
      }

      /* Organic concave fusion with the white inner sub-box (both expanded & collapsed) */
      .rail-item.active {
        background: #ffffff;
        color: var(--zegel-primary);
        font-weight: 700;
        z-index: 2;
      }

      .rail-item.active .rail-icon-box {
        background: transparent;
        color: var(--zegel-primary);
        box-shadow: none;
      }

      .rail-item.active::before,
      .rail-item.active::after {
        content: '';
        position: absolute;
        right: 0;
        width: 18px;
        height: 18px;
        background: transparent;
        pointer-events: none;
      }

      .rail-item.active::before {
        top: -18px;
        border-bottom-right-radius: 18px;
        box-shadow: 6px 6px 0 6px #ffffff;
      }

      .rail-item.active::after {
        bottom: -18px;
        border-top-right-radius: 18px;
        box-shadow: 6px -6px 0 6px #ffffff;
      }

      .rail-label {
        font-size: 0.88rem;
        font-weight: 600;
        padding-right: 14px;
      }

      .rail-toggle-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 36px;
        min-width: 36px;
        padding: 0 10px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        cursor: pointer;
        transition: background-color 150ms ease;
      }

      .rail-toggle-btn:hover {
        background: rgba(255, 255, 255, 0.26);
      }

      .shell-main {
        flex: 1 1 auto;
        min-width: 0;
        height: 100%;
        overflow: hidden;
        background: #ffffff;
        border-radius: 24px;
        display: flex;
        flex-direction: column;
      }

      .shell-topbar {
        height: 70px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        border-bottom: 1px solid var(--zegel-border);
        background: #ffffff;
      }

      .icon-circle-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 1px solid var(--zegel-border);
        background: var(--zegel-bento-bg);
        color: var(--zegel-ink);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: background-color 150ms ease;
      }

      .icon-circle-btn:hover {
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary);
      }

      .notif-dot {
        position: absolute;
        top: 9px;
        right: 10px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--zegel-primary);
      }

      .user-trigger-btn {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 4px 10px 4px 4px;
        border-radius: 9999px;
        border: 1px solid var(--zegel-border);
        background: var(--zegel-bento-bg);
        cursor: pointer;
        transition: background-color 150ms ease;
      }

      .user-trigger-btn:hover {
        background: var(--zegel-primary-soft);
      }

      .user-photo-wrap {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--zegel-primary);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .user-photo-lg {
        width: 46px;
        height: 46px;
      }

      .user-photo-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .user-photo-fallback {
        font-size: 0.78rem;
        font-weight: 700;
      }

      .topbar-dropdown {
        position: absolute;
        right: 0;
        top: calc(100% + 10px);
        z-index: 1030;
        background: #ffffff;
        border: 1px solid var(--zegel-border);
        border-radius: 18px;
        box-shadow: 0 18px 42px rgba(20, 21, 38, 0.14);
      }

      .notif-dropdown {
        width: 270px;
      }

      .user-dropdown {
        width: 268px;
      }

      .dropdown-action-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 8px 10px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        font-size: 0.86rem;
        font-weight: 600;
        color: var(--zegel-text);
        text-align: left;
        cursor: pointer;
      }

      .dropdown-action-btn:hover {
        background: var(--zegel-bento-bg);
      }

      .role-badge-pill {
        padding: 3px 10px;
        border-radius: 9999px;
        background: var(--zegel-primary-soft);
        color: var(--zegel-primary-dark);
        font-size: 0.7rem;
        font-weight: 700;
      }

      .shell-content {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }

      .mobile-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1040;
        background: rgba(20, 21, 38, 0.45);
        backdrop-filter: blur(4px);
      }

      .mobile-drawer {
        width: 260px;
        height: 100vh;
        background: linear-gradient(180deg, #6c63ff 0%, #5b52f0 100%);
      }

      .mobile-nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 14px;
        color: rgba(255, 255, 255, 0.85);
        text-decoration: none;
        font-weight: 600;
      }

      .mobile-nav-link.active {
        background: #ffffff;
        color: var(--zegel-primary);
      }

      @media (max-width: 991px) {
        .app-outer-padding {
          padding: 8px;
        }

        .app-shell-frame {
          height: auto;
          min-height: calc(100vh - 16px);
          padding: 0;
          background: #ffffff;
          border-radius: 20px;
        }

        .shell-main {
          height: auto;
          overflow: visible;
          border-radius: 20px;
          box-shadow: none;
        }

        .shell-content {
          overflow-y: visible;
        }
      }
    `,
  ],
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly sidebarExpanded = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly accountModalOpen = signal(false);
  readonly avatarLoadError = signal(false);

  readonly currentUser$ = this.authService.currentUser$;
  readonly visibleMenuItems$ = this.currentUser$.pipe(
    map((user: User | null) => {
      if (!user) {
        return [];
      }
      return MENU_ITEMS.filter((item) => item.roles.includes(user.role));
    }),
  );

  @HostListener('document:click')
  onDocumentClick(): void {
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
    this.accountModalOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarExpanded.update((expanded) => !expanded);
  }

  toggleNotifications(): void {
    this.userMenuOpen.set(false);
    this.notificationsOpen.update((open) => !open);
  }

  toggleUserMenu(): void {
    this.notificationsOpen.set(false);
    this.userMenuOpen.update((open) => !open);
  }

  openAccountModal(): void {
    this.userMenuOpen.set(false);
    this.accountModalOpen.set(true);
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
    this.userMenuOpen.set(false);
    this.authService.logout();
  }
}
