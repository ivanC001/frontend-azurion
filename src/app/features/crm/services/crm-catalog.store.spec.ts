import { TestBed } from '@angular/core/testing';

import { AuthSessionService } from '@core/auth/auth-session.service';
import type { CrmCatalogoItem } from '@features/crm/data/crm-api.types';

import { CrmCatalogStore } from './crm-catalog.store';

describe('CrmCatalogStore', () => {
  let store: CrmCatalogStore;

  const item = (id: number, extra: Partial<CrmCatalogoItem> = {}) =>
    ({
      id,
      nombre: `Oferta ${id}`,
      tipoItem: 'PRODUCTO',
      estado: 'ACTIVO',
      publicEnabled: true,
      publicToken: `token-secreto-${id}`,
      prospectosCount: 0,
      oportunidadesCount: 0,
      ...extra,
    }) as CrmCatalogoItem;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CrmCatalogStore,
        {
          provide: AuthSessionService,
          useValue: { currentSession: () => ({ tenantId: 'tenant-1' }) },
        },
      ],
    });
    store = TestBed.inject(CrmCatalogStore);
  });

  it('coloca las ofertas nuevas al principio y reemplaza las existentes', () => {
    store.setItems([item(1), item(2)]);

    store.upsert(item(3));
    expect(store.items().map((current) => current.id)).toEqual([3, 1, 2]);

    store.upsert(item(1, { nombre: 'Renombrada' }));
    expect(store.items().map((current) => current.id)).toEqual([3, 1, 2]);
    expect(store.byId(1)?.nombre).toBe('Renombrada');
  });

  it('busca por nombre, tipo, descripcion y slug', () => {
    store.setItems([
      item(1, { nombre: 'Laptop gamer' }),
      item(2, { nombre: 'Servicio', descripcion: 'Mantenimiento anual' }),
      item(3, { nombre: 'Curso', landingSlug: 'curso-excel' }),
    ]);

    expect(store.search('laptop').map((current) => current.id)).toEqual([1]);
    expect(store.search('mantenimiento').map((current) => current.id)).toEqual([2]);
    expect(store.search('excel').map((current) => current.id)).toEqual([3]);
    expect(store.search('   ').length).toBe(3);
  });

  it('solo es publica si esta activa, habilitada y con token', () => {
    expect(store.isPublic(item(1))).toBe(true);
    expect(store.isPublic(item(2, { estado: 'ARCHIVADO' }))).toBe(false);
    expect(store.isPublic(item(3, { publicEnabled: false }))).toBe(false);
    expect(store.isPublic(item(4, { publicToken: null }))).toBe(false);
  });

  it('nunca expone el token completo', () => {
    const masked = store.tokenMask(item(1, { publicToken: 'abcdef123456' }));

    expect(masked).not.toContain('abcdef');
    expect(masked).toContain('123456');
    expect(store.tokenMask(item(2, { publicToken: null }))).toBe('Sin token');
  });

  it('acota la conversion al 100% y evita dividir por cero', () => {
    expect(store.conversionRate(item(1, { prospectosCount: 0, oportunidadesCount: 5 }))).toBe(0);
    expect(store.conversionRate(item(2, { prospectosCount: 10, oportunidadesCount: 3 }))).toBe(30);
    expect(store.conversionRate(item(3, { prospectosCount: 2, oportunidadesCount: 8 }))).toBe(100);
  });

  it('excluye del selector las ofertas que no estan activas', () => {
    store.setItems([item(1), item(2, { estado: 'ARCHIVADO' })]);

    const options = store.activeOptions((tipo) => tipo.toLowerCase());

    expect(options.map((option) => option.value)).toEqual([1]);
    expect(options[0].label).toBe('producto - Oferta 1');
  });

  it('construye la landing con el tenant, el token y el slug', () => {
    const url = store.landingUrl(item(7, { landingSlug: 'oferta-7' }));

    expect(url.startsWith('/crm-lead?')).toBe(true);
    expect(url).toContain('tenant=tenant-1');
    expect(url).toContain('catalogoItemId=7');
    expect(url).toContain('slug=oferta-7');
  });

  it('omite el slug cuando la oferta no lo tiene', () => {
    expect(store.landingUrl(item(8, { landingSlug: null }))).not.toContain('slug=');
  });

  it('cuenta ofertas publicas y acumula leads y oportunidades', () => {
    store.setItems([
      item(1, { prospectosCount: 4, oportunidadesCount: 1 }),
      item(2, { estado: 'ARCHIVADO', prospectosCount: 6, oportunidadesCount: 2 }),
    ]);

    expect(store.stats()).toEqual({ total: 2, public: 1, leads: 10, opportunities: 3 });
  });
});
