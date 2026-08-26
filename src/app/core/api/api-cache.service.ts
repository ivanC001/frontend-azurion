import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

/**
 * Cache en memoria de respuestas de la API, con TTL e invalidacion por prefijo.
 *
 * Vivia como un Map privado dentro de AdminSaasApiService. Eso obligaba a que
 * cualquier otro servicio que necesitase invalidar una entrada -- por ejemplo
 * el CRM al convertir un prospecto en cliente -- tuviera que depender del
 * servicio de admin entero. Al ser infraestructura y no logica de negocio, su
 * sitio es core.
 */
@Injectable({ providedIn: 'root' })
export class ApiCacheService {
  /** Los catalogos maestros cambian poco; dos minutos es suficiente. */
  static readonly DEFAULT_TTL_MS = 120_000;

  private readonly entries = new Map<
    string,
    { readonly expiresAt: number; readonly value$: Observable<unknown> }
  >();

  /**
   * Devuelve la respuesta cacheada o ejecuta la peticion y la memoriza.
   *
   * El shareReplay con refCount:false mantiene el valor aunque no queden
   * suscriptores, que es lo que permite reaprovecharlo entre componentes.
   */
  through<T>(
    key: string,
    sourceFactory: () => Observable<T>,
    ttlMs = ApiCacheService.DEFAULT_TTL_MS,
  ): Observable<T> {
    const now = Date.now();
    const current = this.entries.get(key);
    if (current && current.expiresAt > now) {
      return current.value$ as Observable<T>;
    }

    const value$ = sourceFactory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.entries.set(key, { expiresAt: now + ttlMs, value$ });
    return value$;
  }

  /**
   * Invalida las claves exactas y las que cuelgan de cada prefijo ("clientes"
   * borra tambien "clientes:42").
   */
  invalidate(...prefixes: string[]): void {
    for (const key of [...this.entries.keys()]) {
      if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
