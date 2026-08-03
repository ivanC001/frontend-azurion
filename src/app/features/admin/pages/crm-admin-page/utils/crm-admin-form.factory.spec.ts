import { describe, expect, it } from 'vitest';

import {
  createActivityForm,
  createOpportunityForm,
  createProspectForm,
  createQuoteForm,
  nextActivityType,
} from './crm-admin-form.factory';

describe('CRM admin form factories', () => {
  it('creates prospect defaults with the current tenant context', () => {
    const form = createProspectForm('CO', 'seller-7');

    expect(form.paisCodigo).toBe('CO');
    expect(form.responsableId).toBe('seller-7');
    expect(form.estado).toBe('NUEVO');
    expect(form.catalogoItemId).toBeNull();
  });

  it('creates opportunity defaults from explicit scheduling values', () => {
    const form = createOpportunityForm('seller-9', '2026-08-20', '2026-08-03T09:00');

    expect(form.responsableId).toBe('seller-9');
    expect(form.etapa).toBe('INTERESADO');
    expect(form.fechaCierreEstimada).toBe('2026-08-20');
    expect(form.fechaProximaAccion).toBe('2026-08-03T09:00');
  });

  it('does not share mutable quote lines between forms', () => {
    const first = createQuoteForm();
    const second = createQuoteForm();

    first.detalles[0].descripcion = 'Curso personalizado';

    expect(second.detalles[0].descripcion).toBe('');
    expect(first.detalles).not.toBe(second.detalles);
  });

  it('creates deterministic activity context and rotates the contact channel', () => {
    const form = createActivityForm(
      'seller-3',
      '2026-08-04T10:00',
      new Date('2026-08-02T12:00:00Z'),
    );

    expect(form.usuarioId).toBe('seller-3');
    expect(form.siguienteFechaProgramada).toBe('2026-08-04T10:00');
    expect(nextActivityType('LLAMADA')).toBe('WHATSAPP');
    expect(nextActivityType('WHATSAPP')).toBe('CORREO');
    expect(nextActivityType('CORREO')).toBe('LLAMADA');
  });
});
