import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { CrmApiService } from '@features/crm/data/crm-api.service';

import { CrmCurrencyStore } from './crm-currency.store';
import { CrmFeedbackService } from './crm-feedback.service';

describe('CrmCurrencyStore', () => {
  let store: CrmCurrencyStore;
  let feedback: CrmFeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // El store solo necesita el contrato del API, no su cliente HTTP real.
        { provide: CrmApiService, useValue: {} },
        CrmFeedbackService,
        CrmCurrencyStore,
        {
          provide: AuthSessionService,
          useValue: {
            currentSession: () => ({ empresa: { monedaCodigo: 'pen', monedaSimbolo: 'S/' } }),
          },
        },
      ],
    });

    store = TestBed.inject(CrmCurrencyStore);
    feedback = TestBed.inject(CrmFeedbackService);
  });

  it('normaliza a mayusculas el codigo de la moneda base del tenant', () => {
    expect(store.baseCurrencyCode()).toBe('PEN');
    expect(store.baseCurrencySymbol()).toBe('S/');
  });

  it('aplica el margen sobre el tipo base para obtener el tipo de venta', () => {
    expect(store.saleRate(3.8, 0)).toBe(3.8);
    expect(store.saleRate(3.8, 10)).toBe(4.18);
    expect(store.saleRate(0, 25)).toBe(0);
  });

  it('recalcula el tipo de venta al editar el margen', () => {
    store.setConfigs([
      {
        moneda: 'USD',
        nombre: 'Dolar',
        simbolo: 'US$',
        tipoCambioBase: 4,
        margenConversionPorcentaje: 0,
        tipoCambioVenta: 4,
        activo: true,
      },
    ]);

    store.updateField('USD', 'margenConversionPorcentaje', 50);

    const usd = store.configs().find((currency) => currency.moneda === 'USD');
    expect(usd?.tipoCambioVenta).toBe(6);
  });

  it('no anade la moneda base ni una duplicada', () => {
    const before = store.configs().length;

    store.add('pen');
    store.add('USD');
    store.add('USD');

    expect(store.configs().length).toBe(before);
  });

  it('rechaza una moneda que no este en el catalogo ISO cargado', () => {
    store.setOptions([]);

    store.add('XYZ');

    expect(feedback.errorMessage()).toContain('ISO 4217');
    expect(store.configs().some((currency) => currency.moneda === 'XYZ')).toBe(false);
  });

  it('no guarda sin permiso de administracion', () => {
    store.save(
      {
        moneda: 'USD',
        nombre: 'Dolar',
        simbolo: 'US$',
        tipoCambioBase: 4,
        margenConversionPorcentaje: 0,
        tipoCambioVenta: 4,
        activo: true,
      },
      false,
    );

    expect(feedback.errorMessage()).toContain('permisos');
    expect(store.saving()).toBeNull();
  });

  it('ofrece la moneda base, las activas y la retenida aunque este inactiva', () => {
    store.setConfigs([
      {
        moneda: 'USD',
        nombre: 'Dolar',
        simbolo: 'US$',
        tipoCambioBase: 4,
        margenConversionPorcentaje: 0,
        tipoCambioVenta: 4,
        activo: true,
      },
      {
        moneda: 'EUR',
        nombre: 'Euro',
        simbolo: '€',
        tipoCambioBase: 4.1,
        margenConversionPorcentaje: 0,
        tipoCambioVenta: 4.1,
        activo: false,
      },
    ]);

    expect(store.selectableOptions().map((option) => option.value)).toEqual(['PEN', 'USD']);

    // Al editar un registro en EUR, la moneda no debe desaparecer del selector.
    // El resto va en orden alfabetico, detras de la moneda base.
    expect(store.selectableOptions('EUR').map((option) => option.value)).toEqual([
      'PEN',
      'EUR',
      'USD',
    ]);
  });
});
