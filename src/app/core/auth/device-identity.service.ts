import { Injectable } from '@angular/core';

const DEVICE_ID_KEY = 'azurios.device-id';

@Injectable({ providedIn: 'root' })
export class DeviceIdentityService {
  readonly deviceId = this.resolveDeviceId();
  readonly deviceName = this.resolveDeviceName();

  private resolveDeviceId(): string {
    if (typeof window === 'undefined') {
      return 'server-render';
    }

    const existing = window.localStorage.getItem(DEVICE_ID_KEY)?.trim();
    if (existing) {
      return existing;
    }

    const generated =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : this.randomFallback();
    window.localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  }

  private resolveDeviceName(): string {
    if (typeof navigator === 'undefined') {
      return 'Navegador desconocido';
    }

    const browser = this.browserName(navigator.userAgent);
    const navigatorWithClientHints = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platform =
      navigatorWithClientHints.userAgentData?.platform ||
      navigator.platform ||
      'dispositivo desconocido';
    return `${browser} en ${platform}`.slice(0, 120);
  }

  private browserName(userAgent: string): string {
    if (/Edg\//.test(userAgent)) return 'Microsoft Edge';
    if (/OPR\//.test(userAgent)) return 'Opera';
    if (/Firefox\//.test(userAgent)) return 'Firefox';
    if (/Chrome\//.test(userAgent)) return 'Chrome';
    if (/Safari\//.test(userAgent)) return 'Safari';
    return 'Navegador';
  }

  private randomFallback(): string {
    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }
}
