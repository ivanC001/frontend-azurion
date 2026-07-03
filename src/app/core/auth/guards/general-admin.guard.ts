import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth-session.service';

export const generalAdminGuard: CanActivateFn = () => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);
  const session = sessionService.currentSession();

  if (!session?.accessToken || sessionService.isTokenExpired(session)) {
    sessionService.clearSession();
    return router.createUrlTree(['/auth/login']);
  }

  const roles = session.roles ?? [];
  const isGeneralAdmin =
    !!session.adminGeneral ||
    roles.some((role) => role === 'ROLE_ADMIN_GENERAL' || role === 'ROLE_PLATFORM_ADMIN');

  if (isGeneralAdmin) {
    return true;
  }

  return router.createUrlTree(['/admin/configuracion-empresa']);
};
