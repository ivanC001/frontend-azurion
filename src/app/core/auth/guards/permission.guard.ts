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
  if (moduleCode && !sessionService.hasModule(moduleCode)) {
    return router.createUrlTree(['/admin/dashboard']);
  }

  return !permission || sessionService.hasPermission(permission)
    ? true
    : router.createUrlTree(['/admin/dashboard']);
};
