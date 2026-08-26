import { describe, expect, it } from 'vitest';

import { canIssueElectronicDocuments, facturadorCapabilityMessage } from './facturador-capability';

describe('facturador capability policy', () => {
  it('allows electronic documents only for an active provisioned Peruvian tenant', () => {
    expect(
      canIssueElectronicDocuments({
        paisCodigo: 'PE',
        facturadorStatus: 'PROVISIONADO',
        facturadorDocumentMode: 'ELECTRONIC',
        facturadorFiscalStatus: 'ACTIVE',
        facturadorSunatMode: 'PRODUCTION',
      }),
    ).toBe(true);
  });

  it('keeps foreign tenants in ticket-only mode', () => {
    const capability = {
      paisCodigo: 'US',
      facturadorStatus: 'PROVISIONADO',
      facturadorDocumentMode: 'TICKET_ONLY',
      facturadorFiscalStatus: 'NOT_CONFIGURED',
      facturadorSunatMode: 'DISABLED',
    };

    expect(canIssueElectronicDocuments(capability)).toBe(false);
    expect(facturadorCapabilityMessage(capability)).toContain('tickets internos');
  });

  it('does not expose electronic options while provisioning is pending', () => {
    const capability = {
      paisCodigo: 'PE',
      facturadorStatus: 'PENDIENTE',
      facturadorDocumentMode: 'TICKET_ONLY',
      facturadorFiscalStatus: 'NOT_CONFIGURED',
      facturadorSunatMode: 'DISABLED',
    };

    expect(canIssueElectronicDocuments(capability)).toBe(false);
    expect(facturadorCapabilityMessage(capability)).toContain('aprovisionando');
  });
});
