import {
  isInFollowUpStage,
  resolveFunnelStage,
  type ProspectFunnelContext,
} from './followup.model';

describe('resolveFunnelStage', () => {
  const context = (extra: Partial<ProspectFunnelContext> = {}): ProspectFunnelContext => ({
    estado: 'CONTACTADO',
    hasClosedSale: false,
    hasActiveOpportunity: false,
    hasActivity: false,
    isAutomaticLead: false,
    ...extra,
  });

  it('un contacto en gestion cuenta como seguimiento', () => {
    for (const estado of ['CONTACTADO', 'EN_ESPERA', 'CALIFICADO', 'PERDIDO']) {
      expect(resolveFunnelStage(context({ estado }))).toBe('SEGUIMIENTO');
    }
  });

  it('deja de contar en seguimiento en cuanto tiene oportunidad activa', () => {
    // El bug que motivo esta regla: un CALIFICADO con oportunidad aparecia a la
    // vez en Seguimiento y en Oportunidades, inflando la cartera del vendedor.
    const conOportunidad = context({ estado: 'CALIFICADO', hasActiveOpportunity: true });

    expect(resolveFunnelStage(conOportunidad)).toBe('OPORTUNIDAD');
    expect(isInFollowUpStage(conOportunidad)).toBe(false);
  });

  it('la venta cerrada manda sobre cualquier otra etapa', () => {
    expect(
      resolveFunnelStage(
        context({ estado: 'CALIFICADO', hasClosedSale: true, hasActiveOpportunity: true }),
      ),
    ).toBe('CLIENTE');
  });

  it('una oportunidad perdida devuelve el contacto a seguimiento', () => {
    // hasActiveOpportunity es false cuando la oportunidad se perdio: el contacto
    // debe quedar disponible para retomarlo, no desaparecer del embudo.
    const perdida = context({ estado: 'CALIFICADO', hasActiveOpportunity: false });

    expect(resolveFunnelStage(perdida)).toBe('SEGUIMIENTO');
  });

  it('un lead nuevo sin gestionar sigue siendo captacion', () => {
    expect(resolveFunnelStage(context({ estado: 'NUEVO' }))).toBe('PROSPECTO');
  });

  it('un lead nuevo pasa a seguimiento cuando alguien lo trabaja', () => {
    expect(resolveFunnelStage(context({ estado: 'NUEVO', hasActivity: true }))).toBe('SEGUIMIENTO');
  });

  it('un lead automatico con actividad del sistema no cuenta como trabajado', () => {
    expect(
      resolveFunnelStage(context({ estado: 'NUEVO', hasActivity: true, isAutomaticLead: true })),
    ).toBe('PROSPECTO');
  });

  it('un estado desconocido no se cuela en ninguna etapa de gestion', () => {
    expect(resolveFunnelStage(context({ estado: 'LO_QUE_SEA' }))).toBe('PROSPECTO');
  });

  it('cada contacto cae en exactamente una etapa', () => {
    const escenarios: ProspectFunnelContext[] = [
      context({ estado: 'NUEVO' }),
      context({ estado: 'NUEVO', hasActivity: true }),
      context({ estado: 'CONTACTADO' }),
      context({ estado: 'CALIFICADO', hasActiveOpportunity: true }),
      context({ estado: 'CONVERTIDO', hasClosedSale: true }),
    ];

    const etapas = escenarios.map(resolveFunnelStage);

    expect(etapas).toEqual(['PROSPECTO', 'SEGUIMIENTO', 'SEGUIMIENTO', 'OPORTUNIDAD', 'CLIENTE']);
  });
});
