import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth-session.service';

export const permissionGuard: CanActivateFn = (route) => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);
  const session = sessionService.currentSession();

  if (!session?.accessToken || sessionService.isTokenExpired(session)) {
    sessionService.clearSession();
    return router.createUrlTree(['/auth/login']);
  }

  const permission = String(route.data?.['permission'] ?? '');
  const moduleCode = route.data?.['module'] as string | readonly string[] | undefined;
  const anyModules = (route.data?.['anyModules'] ?? []) as readonly string[];
  const anyPermissions = (route.data?.['anyPermission'] ??
    route.data?.['anyPermissions'] ?? []) as readonly string[];
  const allPermissions = (route.data?.['allPermissions'] ?? []) as readonly string[];
  const fallback = resolveFallbackRoute(sessionService);

  if (moduleCode && !sessionService.hasModule(moduleCode)) {
    return router.createUrlTree([fallback]);
  }
  if (anyModules.length && !anyModules.some((code) => sessionService.hasModule(code))) {
    return router.createUrlTree([fallback]);
  }
  if (anyPermissions.length && !anyPermissions.some((code) => sessionService.hasPermission(code))) {
    return router.createUrlTree([fallback]);
  }
  if (allPermissions.length && !allPermissions.every((code) => sessionService.hasPermission(code))) {
    return router.createUrlTree([fallback]);
  }

  return !permission || sessionService.hasPermission(permission)
    ? true
    : router.createUrlTree([fallback]);
};

function resolveFallbackRoute(session: AuthSessionService): string {
  if (session.hasModule('ERP')) {
    return '/admin/dashboard';
  }
  if (session.hasPermission('CRM_REPORTS_READ') || session.hasPermission('CRM_REPORTS_TEAM')) {
    return '/admin/crm';
  }
  if (session.hasPermission('CRM_LEADS_READ')) {
    return '/admin/crm/prospectos';
  }
  if (session.hasPermission('CRM_ACTIVITIES_READ')) {
    return '/admin/crm/seguimiento';
  }
  if (
    session.hasPermission('CRM_PIPELINE_READ') ||
    session.hasPermission('CRM_PIPELINE_VIEW') ||
    session.hasPermission('CRM_OPPORTUNITIES_READ')
  ) {
    return '/admin/crm/pipeline';
  }
  if (session.hasPermission('CONFIGURACION_WRITE')) {
    return '/admin/configuracion-empresa';
  }
  if (session.hasPermission('USUARIOS_READ')) {
    return '/admin/usuarios';
  }
  if (session.hasPermission('ROLES_READ')) {
    return '/admin/seguridad-empresa';
  }
  return '/auth';
}
