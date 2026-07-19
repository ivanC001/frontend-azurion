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
  private readonly auth = inject(AuthSessionService);
  private readonly session = this.auth.currentSession;

  ngOnInit(): void {
    const current = this.session();
    const roles = current?.roles ?? [];
    const isGeneral =
      !!current?.adminGeneral ||
      roles.some((role) => role === 'ROLE_ADMIN_GENERAL' || role === 'ROLE_PLATFORM_ADMIN');

    const target = this.resolveEntryRoute(isGeneral);
    void this.router.navigate([target], {
      replaceUrl: true,
    });
  }

  private resolveEntryRoute(isGeneral: boolean): string {
    if (isGeneral) {
      return '/admin/control-empresas';
    }
    if (this.auth.hasModule('ERP')) {
      return '/admin/dashboard';
    }
    if (this.auth.hasPermission('CRM_REPORTS_READ') || this.auth.hasPermission('CRM_REPORTS_TEAM')) {
      return '/admin/crm';
    }
    if (this.auth.hasPermission('CRM_LEADS_READ')) {
      return '/admin/crm/prospectos';
    }
    if (this.auth.hasPermission('CRM_ACTIVITIES_READ')) {
      return '/admin/crm/seguimiento';
    }
    if (
      this.auth.hasPermission('CRM_PIPELINE_READ') ||
      this.auth.hasPermission('CRM_PIPELINE_VIEW') ||
      this.auth.hasPermission('CRM_OPPORTUNITIES_READ')
    ) {
      return '/admin/crm/pipeline';
    }
    if (this.auth.hasPermission('CONFIGURACION_WRITE')) {
      return '/admin/configuracion-empresa';
    }
    if (this.auth.hasPermission('USUARIOS_READ')) {
      return '/admin/usuarios';
    }
    return '/admin/seguridad-empresa';
  }
}
