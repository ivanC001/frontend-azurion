import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';

import { AuthSessionService } from './auth-session.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly authSession = inject(AuthSessionService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private permission = '';
  private visible = false;

  constructor() {
    effect(() => {
      this.authSession.currentSession();
      this.render();
    });
  }

  @Input()
  set appHasPermission(permission: string) {
    this.permission = permission;
    this.render();
  }

  private render(): void {
    const shouldShow = !!this.permission && this.authSession.hasPermission(this.permission);
    if (shouldShow === this.visible) {
      return;
    }

    this.visible = shouldShow;
    if (shouldShow) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
