import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from './auth-session.service';

interface ActiveModulesResponse {
  readonly empresaId: number;
  readonly tenantId?: string | null;
  readonly modules: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class SessionModuleSyncService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly session = inject(AuthSessionService);

  syncCurrentTenantModules(): void {
    const current = this.session.currentSession();
    if (!current?.accessToken || current.adminGeneral || !current.tenantId || current.tenantId === 'public') {
      return;
    }

    this.http
      .get<ApiResponse<ActiveModulesResponse>>(this.apiUrl.url('saasCore', '/v1/me/modules'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data.modules))
      .subscribe({
        next: (modules) => this.session.updateModules(modules),
        error: () => undefined,
      });
  }
}
