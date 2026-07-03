import { Injectable, inject } from '@angular/core';

import { APP_SETTINGS, ApiConnectionName } from '@core/config/app-settings';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  private readonly settings = inject(APP_SETTINGS);

  baseUrl(connection: ApiConnectionName): string {
    return this.settings.apiConnections[connection].replace(/\/+$/, '');
  }

  url(connection: ApiConnectionName, path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    return `${this.baseUrl(connection)}/${cleanPath}`;
  }
}
