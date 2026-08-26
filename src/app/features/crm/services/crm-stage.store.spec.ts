import { TestBed } from '@angular/core/testing';

import type { CrmEtapaPipeline } from '@features/crm/data/crm-api.types';

import { CrmStageStore } from './crm-stage.store';

describe('CrmStageStore', () => {
  let store: CrmStageStore;

  const stage = (id: number, codigo: string, extra: Partial<CrmEtapaPipeline> = {}) =>
    ({
      id,
      codigo,
      nombre: `Etapa ${codigo}`,
      orden: id,
      activo: true,
      ...extra,
    }) as CrmEtapaPipeline;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CrmStageStore] });
    store = TestBed.inject(CrmStageStore);
  });

  it('cae al flujo estandar cuando el tenant no configuro etapas', () => {
    expect(store.options().length).toBeGreaterThan(0);
    expect(store.options().every((option) => option.id === null)).toBe(true);
  });

  it('ordena las etapas configuradas segun el flujo, no segun su id', () => {
    store.setStages([stage(9, 'GANADO'), stage(1, 'INTERESADO'), stage(5, 'COTIZADO')]);

    expect(store.options().map((option) => option.value)).toEqual([
      'INTERESADO',
      'COTIZADO',
      'GANADO',
    ]);
  });

  it('descarta codigos que no pertenecen al flujo', () => {
    store.setStages([stage(1, 'INTERESADO'), stage(2, 'ETAPA_INVENTADA')]);

    expect(store.options().map((option) => option.value)).toEqual(['INTERESADO']);
  });

  it('el tablero solo expone las etapas de trabajo', () => {
    const codes = store.activeOptions().map((option) => option.value);

    expect(codes).not.toContain('GANADO');
    expect(codes).not.toContain('PERDIDO');
  });

  it('usa la paleta fija del tablero por encima del color configurado', () => {
    store.setStages([stage(1, 'COTIZADO', { color: '#000000' })]);

    expect(store.color('COTIZADO')).toBe('#000000');
    expect(store.boardColor('COTIZADO')).toBe('#f59e0b');
  });

  it('normaliza un modo de validacion desconocido a WARNING', () => {
    store.setStages([stage(1, 'INTERESADO', { modoValidacion: 'lo-que-sea' })]);

    expect(store.validationMode('INTERESADO')).toBe('WARNING');
  });

  it('respeta el modo configurado cuando es valido', () => {
    store.setStages([stage(1, 'INTERESADO', { modoValidacion: 'strict' })]);

    expect(store.validationMode('INTERESADO')).toBe('STRICT');
  });

  it('aplica el rigor por defecto de cada etapa', () => {
    expect(store.defaultValidationMode('NUEVO')).toBe('FREE');
    expect(store.defaultValidationMode('GANADO')).toBe('STRICT');
    expect(store.defaultValidationMode('INTERESADO')).toBe('WARNING');
  });

  it('calcula el avance en el embudo', () => {
    store.setStages([stage(1, 'INTERESADO'), stage(2, 'COTIZADO'), stage(3, 'GANADO')]);

    expect(store.progress('INTERESADO')).toBe(0);
    expect(store.progress('COTIZADO')).toBe(50);
    expect(store.progress('GANADO')).toBe(100);
    expect(store.progress('DESCONOCIDA')).toBe(0);
  });

  it('humaniza el codigo cuando la etapa no esta configurada', () => {
    expect(store.name('NO_INTERESADO')).toBe('No Interesado');
  });
});
