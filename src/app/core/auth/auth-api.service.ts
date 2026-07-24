import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiResponse } from '@core/api/api-response';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService, LoginResponse } from './auth-session.service';
import { DeviceIdentityService } from './device-identity.service';

export interface LoginRequest {
  readonly username: string;
  readonly password: string;
  readonly tenantId?: string | null;
  readonly deviceId?: string;
  readonly deviceName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly device = inject(DeviceIdentityService);
  private readonly session = inject(AuthSessionService);

  loginPublic(request: Omit<LoginRequest, 'tenantId'>) {
    return this.http
      .post<
        ApiResponse<LoginResponse>
      >(this.apiUrl.url('saasCore', '/v1/auth/public/login'), this.withDevice(request))
      .pipe(map((response) => response.data));
  }

  loginTenant(request: Required<Pick<LoginRequest, 'username' | 'password' | 'tenantId'>>) {
    return this.http
      .post<
        ApiResponse<LoginResponse>
      >(this.apiUrl.url('saasCore', '/v1/auth/tenant/login'), this.withDevice(request))
      .pipe(map((response) => response.data));
  }

  replaceSession(replacementToken: string) {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        this.apiUrl.url('saasCore', '/v1/auth/session/replace'),
        { replacementToken, deviceId: this.device.deviceId },
      )
      .pipe(map((response) => response.data));
  }

  logout() {
    return this.http.post<ApiResponse<void>>(
      this.apiUrl.url('saasCore', '/v1/auth/session/logout'),
      {},
      { headers: this.session.apiHeaders() },
    );
  }

  private withDevice<T extends object>(request: T): T & Pick<LoginRequest, 'deviceId' | 'deviceName'> {
    return {
      ...request,
      deviceId: this.device.deviceId,
      deviceName: this.device.deviceName,
    };
  }
}
