import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { APP_SETTINGS, appSettings } from '@core/config/app-settings';
import { authSessionInterceptor } from '@core/auth/interceptors/auth-session.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: APP_SETTINGS, useValue: appSettings },
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
          cssLayer: false,
        },
      },
    }),
    MessageService,
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authSessionInterceptor])),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
