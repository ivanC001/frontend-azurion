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

export interface CurrentUserProfile {
  readonly id: number;
  readonly username: string;
  readonly nombres: string;
  readonly apellidos: string | null;
  readonly email: string | null;
  readonly telefono: string | null;
  readonly cargo: string | null;
  readonly fotoPerfilUrl: string | null;
  readonly activo: boolean;
  readonly puedeEditarDatosPersonales: boolean;
  readonly puedeCambiarContrasena: boolean;
  readonly tipoCuenta: string;
  readonly roles: readonly string[];
  readonly sucursales: readonly {
    readonly id: number;
    readonly codigo: string;
    readonly nombre: string;
  }[];
}

export interface UpdateCurrentUserProfileRequest {
  readonly nombres: string;
  readonly apellidos: string | null;
  readonly telefono: string | null;
  readonly cargo: string | null;
  readonly email: string | null;
}

export interface ChangeCurrentUserPasswordRequest {
  readonly contrasenaActual: string;
  readonly nuevaContrasena: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly device = inject(DeviceIdentityService);
  private readonly session = inject(AuthSessionService);

  loginPublic(request: Omit<LoginRequest, 'tenantId'>) {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        this.apiUrl.url('saasCore', '/v1/auth/public/login'),
        this.withDevice(request),
      )
      .pipe(map((response) => response.data));
  }

  loginTenant(request: Required<Pick<LoginRequest, 'username' | 'password' | 'tenantId'>>) {
    return this.http
      .post<ApiResponse<LoginResponse>>(
        this.apiUrl.url('saasCore', '/v1/auth/tenant/login'),
        this.withDevice(request),
      )
      .pipe(map((response) => response.data));
  }

  replaceSession(replacementToken: string) {
    return this.http
      .post<ApiResponse<LoginResponse>>(this.apiUrl.url('saasCore', '/v1/auth/session/replace'), {
        replacementToken,
        deviceId: this.device.deviceId,
      })
      .pipe(map((response) => response.data));
  }

  logout() {
    return this.http.post<ApiResponse<void>>(
      this.apiUrl.url('saasCore', '/v1/auth/session/logout'),
      {},
      { headers: this.session.apiHeaders() },
    );
  }

  getCurrentProfile() {
    return this.http
      .get<ApiResponse<CurrentUserProfile>>(this.apiUrl.url('saasCore', '/v1/auth/profile'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateCurrentProfile(request: UpdateCurrentUserProfileRequest) {
    return this.http
      .put<ApiResponse<CurrentUserProfile>>(
        this.apiUrl.url('saasCore', '/v1/auth/profile'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCurrentProfilePhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http
      .put<ApiResponse<CurrentUserProfile>>(
        this.apiUrl.url('saasCore', '/v1/auth/profile/photo'),
        formData,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  deleteCurrentProfilePhoto() {
    return this.http
      .delete<ApiResponse<CurrentUserProfile>>(
        this.apiUrl.url('saasCore', '/v1/auth/profile/photo'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  changeCurrentPassword(request: ChangeCurrentUserPasswordRequest) {
    return this.http
      .put<ApiResponse<void>>(this.apiUrl.url('saasCore', '/v1/auth/profile/password'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  private withDevice<T extends object>(
    request: T,
  ): T & Pick<LoginRequest, 'deviceId' | 'deviceName'> {
    return {
      ...request,
      deviceId: this.device.deviceId,
      deviceName: this.device.deviceName,
    };
  }
}
