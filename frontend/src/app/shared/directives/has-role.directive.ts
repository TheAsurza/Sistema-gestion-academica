import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { User, UserRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnDestroy {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  private allowedRoles: UserRole[] = [];
  private currentUser: User | null = null;
  private hasView = false;
  private readonly subscription: Subscription;

  constructor() {
    this.subscription = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.updateView();
    });
  }

  @Input()
  set appHasRole(roles: UserRole[]) {
    this.allowedRoles = Array.isArray(roles) ? roles : [];
    this.updateView();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private updateView(): void {
    const canRender =
      !!this.currentUser &&
      this.allowedRoles.length > 0 &&
      this.allowedRoles.includes(this.currentUser.role);

    if (canRender && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!canRender && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
