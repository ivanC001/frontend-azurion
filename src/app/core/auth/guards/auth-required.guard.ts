import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../auth-session.service';

export const authRequiredGuard: CanActivateFn = () => {
  const sessionService = inject(AuthSessionService);
  const router = inject(Router);
  const session = sessionService.currentSession();

  if (!session?.accessToken || sessionService.isTokenExpired(session)) {
    sessionService.clearSession();
    return router.createUrlTree(['/auth/login']);
  }

  return true;
};
