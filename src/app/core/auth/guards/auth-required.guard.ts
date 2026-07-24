import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth-session.service';

const PLATFORM_ADMIN_ROUTES = [
  '/admin/empresas',
  '/admin/planes',
  '/admin/control-empresas',
  '/admin/seguridad-plataforma',
  '/admin/correo-azurion',
  '/admin/facturador',
] as const;

export const authRequiredGuard: CanActivateFn = (_route, state) => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);
  const session = sessionService.currentSession();

  if (!session?.accessToken || sessionService.isTokenExpired(session)) {
    sessionService.clearSession();
    const loginUrl = PLATFORM_ADMIN_ROUTES.some((route) => state.url.startsWith(route))
      ? '/auth/login'
      : '/auth';
    return router.createUrlTree([loginUrl], {
      queryParams: state.url && state.url !== '/admin' ? { redirectUrl: state.url } : undefined,
    });
  }

  return true;
};
