import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

import { AuthSessionService } from '@core/auth/auth-session.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admin-entry-page',
  template: '',
})
export class AdminEntryPage implements OnInit {
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService).currentSession;

  ngOnInit(): void {
    const current = this.session();
    const roles = current?.roles ?? [];
    const isGeneral =
      !!current?.adminGeneral ||
      roles.some((role) => role === 'ROLE_ADMIN_GENERAL' || role === 'ROLE_PLATFORM_ADMIN');

    void this.router.navigate(['/admin/dashboard'], {
      replaceUrl: true,
    });
  }
}
