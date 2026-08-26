import { Injectable, inject, signal } from '@angular/core';

import { AuthSessionService } from '@core/auth/auth-session.service';
import type { CrmCatalogoItem } from '@features/crm/data/crm-api.types';

/**
 * Catalogo comercial: las ofertas que el CRM puede asociar a un prospecto,
 * una oportunidad o una landing publica.
 *
 * Extraido de CrmPage. Cubre los datos y las propiedades derivadas de un item;
 * el formulario de alta y edicion sigue en el contenedor porque depende de la
 * definicion dinamica de campos por tipo de oferta.
 */
@Injectable()
export class CrmCatalogStore {
  private static readonly ESTADO_ACTIVO = 'ACTIVO';

  private static readonly LANDING_CAMPAIGN = 'Landing CRM';

  private static readonly LANDING_PATH = '/crm-lead';

  /** Cuantos digitos del token se dejan visibles al enmascararlo. */
  private static readonly TOKEN_VISIBLE_CHARS = 6;

  private readonly auth = inject(AuthSessionService);

  readonly items = signal<CrmCatalogoItem[]>([]);

  setItems(items: CrmCatalogoItem[]): void {
    this.items.set(items);
  }

  /** Inserta o reemplaza; los nuevos van al principio para verse al guardar. */
  upsert(item: CrmCatalogoItem): void {
    this.items.update((items) =>
      items.some((current) => current.id === item.id)
        ? items.map((current) => (current.id === item.id ? item : current))
        : [item, ...items],
    );
  }

  byId(id: number | null | undefined): CrmCatalogoItem | null {
    return id == null ? null : (this.items().find((item) => item.id === id) ?? null);
  }

  /** Busqueda libre sobre los campos que el usuario ve de la oferta. */
  search(query: string): CrmCatalogoItem[] {
    const needle = query.trim().toLowerCase();
    if (needle === '') {
      return this.items();
    }

    return this.items().filter((item) =>
      `${item.nombre} ${item.tipoItem} ${item.descripcion ?? ''} ${item.estado} ${item.landingSlug ?? ''} ${item.metadataJson ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }

  stats(): { total: number; public: number; leads: number; opportunities: number } {
    const items = this.items();
    return {
      total: items.length,
      public: items.filter((item) => this.isPublic(item)).length,
      leads: items.reduce((total, item) => total + Number(item.prospectosCount || 0), 0),
      opportunities: items.reduce((total, item) => total + Number(item.oportunidadesCount || 0), 0),
    };
  }

  /**
   * Ofertas seleccionables en un formulario. Solo las activas: una oferta
   * archivada no debe poder asociarse a nuevos registros.
   */
  activeOptions(
    labelForType: (tipoItem: string) => string,
  ): { label: string; value: number; tipoItem: string }[] {
    return this.items()
      .filter((item) => item.estado === CrmCatalogStore.ESTADO_ACTIVO)
      .map((item) => ({
        label: `${labelForType(item.tipoItem)} - ${item.nombre}`,
        value: item.id,
        tipoItem: item.tipoItem,
      }));
  }

  /**
   * Una oferta se publica solo si esta activa, tiene el acceso publico
   * habilitado y dispone de token: sin las tres cosas la landing no resuelve.
   */
  isPublic(item: CrmCatalogoItem): boolean {
    return (
      item.estado === CrmCatalogStore.ESTADO_ACTIVO &&
      item.publicEnabled !== false &&
      !!item.publicToken
    );
  }

  /** El token nunca se muestra entero; basta la cola para reconocerlo. */
  tokenMask(item: CrmCatalogoItem): string {
    const token = item.publicToken || '';
    return token ? `••••••••${token.slice(-CrmCatalogStore.TOKEN_VISIBLE_CHARS)}` : 'Sin token';
  }

  /** Porcentaje de leads de esta oferta que llegaron a ser oportunidad. */
  conversionRate(item: CrmCatalogoItem): number {
    const leads = Number(item.prospectosCount || 0);
    const opportunities = Number(item.oportunidadesCount || 0);
    return leads > 0 ? Math.min(Math.round((opportunities / leads) * 100), 100) : 0;
  }

  landingUrl(item: CrmCatalogoItem): string {
    const session = this.auth.currentSession();
    const params = new URLSearchParams({
      tenant: session?.tenantId || session?.empresa?.schemaName || '',
      catalogoItemId: String(item.id),
      token: item.publicToken || '',
      campania: CrmCatalogStore.LANDING_CAMPAIGN,
    });
    if (item.landingSlug) {
      params.set('slug', item.landingSlug);
    }
    return `${CrmCatalogStore.LANDING_PATH}?${params.toString()}`;
  }

  landingAbsoluteUrl(relativeUrl: string): string {
    return typeof window === 'undefined'
      ? relativeUrl
      : new URL(relativeUrl, window.location.origin).toString();
  }
}
