import { Injectable, signal } from '@angular/core';

/**
 * Mensajes de error y exito compartidos por el modulo CRM.
 *
 * Eran dos signals dentro de CrmPage con casi 300 referencias repartidas por
 * el componente. Al vivir en un servicio, cualquier store de dominio que se
 * extraiga del contenedor puede reportar al usuario sin volver a depender de
 * el, que es lo que impedia trocearlo.
 */
@Injectable()
export class CrmFeedbackService {
  private static readonly FALLBACK = 'No se pudo completar la operacion.';

  readonly errorMessage = signal<string | null>(null);

  readonly successMessage = signal<string | null>(null);

  error(message: string | null): void {
    this.errorMessage.set(message);
  }

  success(message: string | null): void {
    this.successMessage.set(message);
  }

  clear(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  /**
   * Extrae el mensaje util de un error de la API. La respuesta trae el detalle
   * concreto en `error.details[0]`; si no llega, se cae al mensaje generico
   * antes que exponer el error crudo.
   */
  resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || CrmFeedbackService.FALLBACK;
    }
    return CrmFeedbackService.FALLBACK;
  }

  /** Reporta un error de la API en un solo paso. */
  reportError(error: unknown): void {
    this.error(this.resolveError(error));
  }
}
